import { Injectable, NotFoundException } from "@nestjs/common";
import { Document, DocumentClassification, DocumentType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { DmsBootstrapService } from "./dms-bootstrap.service";
import { requireActorUserId, requireTenantId } from "./dms-context";

export interface CreateDocumentInput {
  title: string;
  documentType: DocumentType;
  documentCategoryId: string;
  classification?: DocumentClassification;
  description?: string;
  ownerUserId: string;
  ownerDepartmentId?: string;
  companyId?: string;
  branchId?: string;
  siteId?: string;
  departmentId?: string;
  effectiveDate?: Date;
  reviewCycleMonths?: number;
  retentionYears?: number;
  relatedRegulatoryRefs?: string[];
}

// Task 2.1 (Modul 03 §5/§6) — header dokumen. BELUM ada controller HTTP
// (pola sama 1.1-1.6 modul tanpa deliverable apps/web); dms.document.*
// sudah di-seed RBAC baseline, siap digerbangi begitu ada endpoint.
@Injectable()
export class DocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberingService: NumberingService,
    private readonly bootstrapService: DmsBootstrapService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * BR-01 (PRD §5) — documents.document_number via NumberingService (0.10,
   * module_code=DMS) — task 2.1 adalah KONSUMEN PRODUKSI PERTAMA
   * generateNext() (0.10-1.7 belum ada modul domain yang genuinely
   * memanggilnya di luar test). numbering_configs tenant di-lazy-create
   * kalau belum ada (DmsBootstrapService).
   *
   * TIGA langkah TERPISAH (bukan satu withRls() membungkus semua) — alasan
   * PERSIS DocumentVersionService.submitForApproval(): baik
   * ensureNumberingConfig() maupun generateNext() (0.10, row-lock SENDIRI)
   * membuka withRls()-nya masing-masing; nesting terverifikasi tidak hang
   * tapi tidak benar-benar atomik, jadi dipisah eksplisit alih-alih
   * menyesatkan pembaca kode. Konsekuensi diterima sama: gagal PERSIS
   * setelah generateNext() commit tapi sebelum document dibuat membakar
   * satu nomor urut tanpa dokumen (gap TDD §26, pola sama kegagalan
   * di-terima lainnya).
   */
  async createDocument(input: CreateDocumentInput): Promise<Document> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    const category = await this.prisma.withRls((tx) =>
      tx.documentCategory.findUniqueOrThrow({ where: { id: input.documentCategoryId } }),
    );
    await this.bootstrapService.ensureNumberingConfig();
    const documentNumber = await this.numberingService.generateNext("DMS", {
      variables: { CATEGORY_CODE: category.code },
    });

    return this.prisma.withRls((tx) =>
      tx.document.create({
        data: {
          tenantId,
          title: input.title,
          documentType: input.documentType,
          documentCategoryId: input.documentCategoryId,
          classification: input.classification ?? "INTERNAL",
          description: input.description,
          ownerUserId: input.ownerUserId,
          ownerDepartmentId: input.ownerDepartmentId,
          companyId: input.companyId,
          branchId: input.branchId,
          siteId: input.siteId,
          departmentId: input.departmentId,
          effectiveDate: input.effectiveDate,
          reviewCycleMonths: input.reviewCycleMonths,
          retentionYears: input.retentionYears,
          relatedRegulatoryRefs: input.relatedRegulatoryRefs ?? [],
          documentNumber,
          status: "DRAFT",
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );
  }

  async getById(documentId: string): Promise<Document> {
    return this.prisma.withRls((tx) => tx.document.findUniqueOrThrow({ where: { id: documentId } }));
  }

  /** PRD §3 "Seluruh user terautentikasi: dms.document.read (hanya dokumen
   * PUBLISHED dalam scope-nya)". Scope diinterpretasikan via kolom scope
   * langsung user (users.site_id/department_id, 1.3) — dokumen dgn kolom
   * scope NULL berlaku LEBIH LUAS (PRD literal "NULL berarti berlaku di
   * atasnya"), jadi selalu match. BUKAN RBAC scope-hierarchy containment
   * penuh (platform/rbac/scope-hierarchy.ts, 1.1) — task ini scope ke
   * kecocokan LANGSUNG site/department milik user sendiri, containment
   * naik/turun penuh di luar timebox (gap TDD §26). */
  async listPublishedForCurrentUser(): Promise<Document[]> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();

    return this.prisma.withRls(async (tx) => {
      const actor = await tx.user.findUniqueOrThrow({ where: { id: actorUserId }, select: { siteId: true, departmentId: true } });
      return tx.document.findMany({
        where: {
          tenantId,
          status: "PUBLISHED",
          deletedAt: null,
          OR: [{ siteId: null }, { siteId: actor.siteId ?? undefined }],
          AND: [{ OR: [{ departmentId: null }, { departmentId: actor.departmentId ?? undefined }] }],
        },
        orderBy: { documentNumber: "asc" },
      });
    });
  }

  /** PRD §4.4 — penarikan dokumen. Direalisasikan sbg TRANSISI LANGSUNG
   * (bukan lewat Workflow Engine 1-stage) — PRD sendiri bilang "bisa juga
   * memakai Workflow Engine ringan... disarankan default" (opsional,
   * BUKAN wajib), disederhanakan demi scope task ini (gap TDD §26).
   * deletedAt TETAP NULL (PRD literal "soft delete TIDAK dipakai utk
   * status ini") — murni status lifecycle berubah. */
  async retire(documentId: string, reason: string): Promise<Document> {
    const updatedBy = requireActorUserId();

    // NotificationService.enqueue() (0.11) membuka withRls()-nya SENDIRI
    // ($transaction baru) — TIDAK BOLEH dipanggil dari DALAM withRls() di
    // bawah (Prisma interactive transaction TIDAK mendukung nested
    // $transaction pada client yang sama). Baris DB di-commit LEBIH DULU,
    // recipient list dikumpulkan DI DALAM transaksi, notifikasi dikirim
    // SETELAH transaksi selesai — pola sama alasan enqueue() sendiri push
    // job BullMQ di luar transaksinya (lihat banner comment method itu).
    const { retired, recipientUserIds } = await this.prisma.withRls(async (tx) => {
      const document = await tx.document.findUniqueOrThrow({ where: { id: documentId } });
      if (document.status === "RETIRED") {
        throw new NotFoundException(`Dokumen ${documentId} sudah RETIRED.`);
      }

      const updated = await tx.document.update({
        where: { id: documentId },
        data: { status: "RETIRED", updatedBy },
      });

      // PRD §4.4 poin 3 — notifikasi ke seluruh target document_distribution
      // VERSI TERAKHIR bahwa dokumen tidak lagi berlaku.
      const recipients = document.currentVersionId
        ? await tx.readAcknowledgementLog.findMany({
            where: { documentVersionId: document.currentVersionId },
            select: { userId: true },
            distinct: ["userId"],
          })
        : [];

      return { retired: updated, recipientUserIds: recipients.map((r) => r.userId) };
    });

    for (const recipientUserId of recipientUserIds) {
      await this.notificationService.enqueue({
        eventType: "DOCUMENT_RETIRED",
        entityType: "DOCUMENT",
        entityId: documentId,
        recipientUserId,
        priority: "MEDIUM",
        eventCategory: "DOCUMENT",
        variables: { title: retired.title, reason },
      });
    }

    return retired;
  }
}
