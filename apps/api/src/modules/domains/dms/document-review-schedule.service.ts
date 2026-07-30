import { BadRequestException, Injectable } from "@nestjs/common";
import { DocumentReviewSchedule, ReviewOutcome } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { DocumentService } from "./document.service";
import { requireActorUserId, requireTenantId } from "./dms-context";

export interface RecordReviewOutcomeInput {
  reviewScheduleId: string;
  reviewOutcome: ReviewOutcome;
  /** WAJIB kalau reviewOutcome MINOR_REVISION/MAJOR_REVISION_TRIGGERED (PRD
   * §4.3 poin 3) — versi baru dibuat TERPISAH lewat DocumentVersionService
   * SEBELUM memanggil method ini, id-nya dioper ke sini murni utk
   * menghubungkan (resulting_document_version_id), method ini TIDAK
   * membuat versi apa pun sendiri. */
  resultingDocumentVersionId?: string;
  /** WAJIB kalau reviewOutcome RETIRE_DOCUMENT (PRD §4.4). */
  retireReason?: string;
}

// Task 2.1 (Modul 03 §4.3, BR-06) — pencatatan hasil tinjauan berkala.
// Pembuatan jadwal AWAL (saat publish) ada di
// DocumentWorkflowCompletionListener; job document-review-scan (task
// terpisah) yang menandai OVERDUE + kirim reminder H-30 — service ini murni
// menangani SISI MANUAL "reviewer mencatat hasil".
@Injectable()
export class DocumentReviewScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentService: DocumentService,
  ) {}

  async listForDocument(documentId: string): Promise<DocumentReviewSchedule[]> {
    return this.prisma.withRls((tx) =>
      tx.documentReviewSchedule.findMany({ where: { documentId }, orderBy: { scheduledReviewDate: "desc" } }),
    );
  }

  /**
   * PRD §4.3 poin 3-4: NO_CHANGE_NEEDED -> selesai, jadwalkan siklus
   * BERIKUTNYA otomatis (review_cycle_months lagi) — tanpa ini "tinjauan
   * berkala BERULANG" (ERD summary §5) berhenti setelah satu kali.
   * MINOR/MAJOR_REVISION_TRIGGERED -> selesai, TIDAK dijadwalkan ulang di
   * sini — siklus berikutnya datang otomatis dari publish versi hasil
   * revisi (DocumentWorkflowCompletionListener), menjadwalkan di SINI JUGA
   * akan menghasilkan 2 baris SCHEDULED duplikat. RETIRE_DOCUMENT -> alur
   * §4.4 (DocumentService.retire()).
   */
  async recordOutcome(input: RecordReviewOutcomeInput): Promise<DocumentReviewSchedule> {
    const reviewerUserId = requireActorUserId();
    const tenantId = requireTenantId();

    if (input.reviewOutcome === "MINOR_REVISION" || input.reviewOutcome === "MAJOR_REVISION_TRIGGERED") {
      if (!input.resultingDocumentVersionId) {
        throw new BadRequestException(`reviewOutcome=${input.reviewOutcome} wajib menyertakan resultingDocumentVersionId.`);
      }
    }
    if (input.reviewOutcome === "RETIRE_DOCUMENT" && !input.retireReason) {
      throw new BadRequestException("reviewOutcome=RETIRE_DOCUMENT wajib menyertakan retireReason.");
    }

    const { schedule, documentId } = await this.prisma.withRls(async (tx) => {
      const existing = await tx.documentReviewSchedule.findUniqueOrThrow({ where: { id: input.reviewScheduleId } });
      const document = await tx.document.findUniqueOrThrow({ where: { id: existing.documentId } });
      const now = new Date();

      const updated = await tx.documentReviewSchedule.update({
        where: { id: input.reviewScheduleId },
        data: {
          actualReviewDate: now,
          reviewerUserId,
          reviewOutcome: input.reviewOutcome,
          resultingDocumentVersionId: input.resultingDocumentVersionId,
          status: "COMPLETED",
          updatedBy: reviewerUserId,
        },
      });

      if (input.reviewOutcome === "NO_CHANGE_NEEDED" && document.reviewCycleMonths) {
        const nextDate = new Date(now);
        nextDate.setUTCMonth(nextDate.getUTCMonth() + document.reviewCycleMonths);
        await tx.documentReviewSchedule.create({
          data: {
            tenantId,
            documentId: document.id,
            scheduledReviewDate: nextDate,
            status: "SCHEDULED",
            createdBy: reviewerUserId,
            updatedBy: reviewerUserId,
          },
        });
        await tx.document.update({ where: { id: document.id }, data: { nextReviewDate: nextDate } });
      }

      return { schedule: updated, documentId: document.id };
    });

    if (input.reviewOutcome === "RETIRE_DOCUMENT") {
      // DocumentService.retire() withRls()-nya SENDIRI — dipanggil SETELAH
      // transaksi di atas commit, alasan sama seluruh call site lain modul
      // ini (retire() SENDIRI juga enqueue notifikasi setelah transaksinya).
      await this.documentService.retire(documentId, input.retireReason!);
    }

    return schedule;
  }
}
