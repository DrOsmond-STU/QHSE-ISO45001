import { Document, DocumentClassification, DocumentType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { DmsBootstrapService } from "./dms-bootstrap.service";
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
export declare class DocumentService {
    private readonly prisma;
    private readonly numberingService;
    private readonly bootstrapService;
    private readonly notificationService;
    constructor(prisma: PrismaService, numberingService: NumberingService, bootstrapService: DmsBootstrapService, notificationService: NotificationService);
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
    createDocument(input: CreateDocumentInput): Promise<Document>;
    getById(documentId: string): Promise<Document>;
    /** PRD §3 "Seluruh user terautentikasi: dms.document.read (hanya dokumen
     * PUBLISHED dalam scope-nya)". Scope diinterpretasikan via kolom scope
     * langsung user (users.site_id/department_id, 1.3) — dokumen dgn kolom
     * scope NULL berlaku LEBIH LUAS (PRD literal "NULL berarti berlaku di
     * atasnya"), jadi selalu match. BUKAN RBAC scope-hierarchy containment
     * penuh (platform/rbac/scope-hierarchy.ts, 1.1) — task ini scope ke
     * kecocokan LANGSUNG site/department milik user sendiri, containment
     * naik/turun penuh di luar timebox (gap TDD §26). */
    listPublishedForCurrentUser(): Promise<Document[]>;
    /** PRD §4.4 — penarikan dokumen. Direalisasikan sbg TRANSISI LANGSUNG
     * (bukan lewat Workflow Engine 1-stage) — PRD sendiri bilang "bisa juga
     * memakai Workflow Engine ringan... disarankan default" (opsional,
     * BUKAN wajib), disederhanakan demi scope task ini (gap TDD §26).
     * deletedAt TETAP NULL (PRD literal "soft delete TIDAK dipakai utk
     * status ini") — murni status lifecycle berubah. */
    retire(documentId: string, reason: string): Promise<Document>;
}
