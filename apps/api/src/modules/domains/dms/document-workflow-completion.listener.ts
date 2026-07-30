import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationService } from "../../../platform/notification/notification.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WORKFLOW_INSTANCE_COMPLETED_EVENT } from "../../../platform/workflow-engine/workflow-engine.constants";
import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { assertCanBeCurrentVersion, validateDocumentVersionStatusTransition } from "./document-version-lifecycle";

const DMS_WORKFLOW_ENTITY_TYPE = "document_version";

/**
 * Task 2.1 — KONSUMEN SUNGGUHAN PERTAMA WORKFLOW_INSTANCE_COMPLETED_EVENT
 * (event ada sejak 0.9; banner comment aslinya menduga 0.11/1.4 yang akan
 * mendengarkannya — DIVERIFIKASI keduanya TIDAK PERNAH benar-benar
 * implementasi listener, grep bersih di seluruh src/ sebelum task ini).
 * Merealisasikan PRD §4.1 "Stage 3 Publikasi otomatis oleh sistem setelah
 * approve final" — BUKAN workflow_stages ketiga (WorkflowEngineService
 * mensyaratkan tiap stage py approver sungguhan, sistem tidak "approve"),
 * melainkan reaksi DOMAIN atas penyelesaian instance.
 *
 * KRITIS (diverifikasi EMPIRIS via probe manual, dihapus setelah dipakai):
 * TIDAK BOLEH re-query workflow_instances/workflow_tasks by instanceId di
 * sini — emit() dipanggil DI DALAM transaksi WorkflowEngineService SEBELUM
 * commit sungguhan (fire-and-forget, listener async TIDAK di-await), dan
 * listener dgn koneksi established (pola DI sungguhan) TERBUKTI melihat
 * state PRA-commit di 21/30 percobaan berulang — race NYATA. Payload event
 * (entityType/entityId/status) sudah cukup, TIDAK PERNAH baca ulang tabel
 * yang disentuh transaksi yang sedang emit. document_versions/documents
 * yang DIBACA/DITULIS listener ini AMAN — ditulis transaksi TERPISAH yang
 * SUDAH lama commit (submitForApproval(), request/waktu yang beda sama
 * sekali dari actOnTask() yang memicu event ini).
 *
 * tenantContextStorage.run() dipasang manual di sini (BUKAN via
 * TenantContextMiddleware — event listener bukan request HTTP) — payload
 * event.tenantId dipakai sbg context ambient satu-satunya cara
 * PrismaService.withRls() bisa jalan dari luar siklus request.
 */
@Injectable()
export class DocumentWorkflowCompletionListener {
  private readonly logger = new Logger(DocumentWorkflowCompletionListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  @OnEvent(WORKFLOW_INSTANCE_COMPLETED_EVENT)
  async onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void> {
    if (payload.entityType !== DMS_WORKFLOW_ENTITY_TYPE) return;

    await tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
      try {
        if (payload.status === "APPROVED") {
          await this.publishVersion(payload.entityId);
        } else if (payload.status === "REJECTED") {
          await this.rejectVersion(payload.entityId);
        }
      } catch (err) {
        // Listener event TIDAK BOLEH throw ke EventEmitter2 (unhandled
        // rejection di fire-and-forget context) — log terstruktur sbg
        // gantinya, pola sama seluruh consumer job/worker lain codebase
        // ini yang menangani kegagalan eksplisit alih-alih crash proses.
        this.logger.error(`Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk document_version=${payload.entityId}: ${err instanceof Error ? err.message : err}`);
      }
    });
  }

  private async publishVersion(documentVersionId: string): Promise<void> {
    await this.prisma.withRls(async (tx) => {
      const version = await tx.documentVersion.findUniqueOrThrow({ where: { id: documentVersionId } });
      validateDocumentVersionStatusTransition(version.status, "APPROVED");
      validateDocumentVersionStatusTransition("APPROVED", "PUBLISHED");
      assertCanBeCurrentVersion("PUBLISHED");

      const document = await tx.document.findUniqueOrThrow({ where: { id: version.documentId } });
      const now = new Date();

      // BR-03 (PRD §6) — versi PUBLISHED baru otomatis mensupersede versi
      // PUBLISHED sebelumnya (kalau ada), TIDAK BOLEH dua PUBLISHED aktif
      // bersamaan utk 1 document_id.
      if (document.currentVersionId) {
        await tx.documentVersion.update({
          where: { id: document.currentVersionId },
          data: { status: "SUPERSEDED", supersededByVersionId: documentVersionId },
        });
      }

      await tx.documentVersion.update({
        where: { id: documentVersionId },
        data: { status: "PUBLISHED", approvedAt: now, publishedAt: now },
      });

      await tx.document.update({
        where: { id: document.id },
        data: { status: "PUBLISHED", currentVersionId: documentVersionId },
      });

      // PRD §4.1 poin 6 — "Setelah PUBLISHED, sistem otomatis membuat
      // document_distribution sesuai konfigurasi kategori dokumen" — SENGAJA
      // TIDAK diimplementasikan di sini: document_categories (PRD §5) TIDAK
      // punya kolom "target distribusi default" apa pun — tidak ada tempat
      // menyimpan konfigurasi itu di skema literal. Document Controller
      // membuat document_distribution SECARA MANUAL lewat
      // DocumentDistributionService SETELAH publish (gap TDD §26) — DI
      // SANALAH (bukan di sini) notifikasi "DOCUMENT_PUBLISHED"/PRD §8
      // "Dokumen baru wajib dibaca" sebenarnya terkirim, krn recipient list
      // (read_acknowledgement_logs hasil ekspansi target) baru ADA saat itu
      // — di titik INI (baru saja PUBLISHED, distribusi belum dibuat sama
      // sekali) daftar penerimanya selalu kosong.
      if (document.reviewCycleMonths) {
        const scheduledReviewDate = new Date(now);
        scheduledReviewDate.setUTCMonth(scheduledReviewDate.getUTCMonth() + document.reviewCycleMonths);
        await tx.documentReviewSchedule.create({
          data: {
            tenantId: document.tenantId,
            documentId: document.id,
            scheduledReviewDate,
            status: "SCHEDULED",
            createdBy: document.ownerUserId,
            updatedBy: document.ownerUserId,
          },
        });
        await tx.document.update({ where: { id: document.id }, data: { nextReviewDate: scheduledReviewDate } });
      }
    });
  }

  private async rejectVersion(documentVersionId: string): Promise<void> {
    const { submitterId, title } = await this.prisma.withRls(async (tx) => {
      const version = await tx.documentVersion.findUniqueOrThrow({ where: { id: documentVersionId } });
      validateDocumentVersionStatusTransition(version.status, "REJECTED");

      await tx.documentVersion.update({ where: { id: documentVersionId }, data: { status: "REJECTED" } });

      const document = await tx.document.findUniqueOrThrow({ where: { id: version.documentId } });
      // Revisi ditolak: dokumen yang SUDAH PUBLISHED sebelumnya kembali
      // berlaku APA ADANYA (versi lama TIDAK disentuh, statusnya tetap
      // PUBLISHED, tidak pernah ikut disupersede krn publishVersion() belum
      // pernah dipanggil utk versi yang ditolak). Dokumen yang BELUM PERNAH
      // py versi PUBLISHED kembali ke DRAFT (siklus §4.1 poin 5 "kembali ke
      // Document Controller untuk revisi").
      await tx.document.update({
        where: { id: document.id },
        data: { status: document.currentVersionId ? "PUBLISHED" : "DRAFT" },
      });

      return { submitterId: version.createdBy, title: document.title };
    });

    await this.notificationService.enqueue({
      eventType: "DOCUMENT_VERSION_REJECTED",
      entityType: "DOCUMENT_VERSION",
      entityId: documentVersionId,
      recipientUserId: submitterId,
      priority: "MEDIUM",
      eventCategory: "DOCUMENT",
      variables: { title },
    });
  }
}
