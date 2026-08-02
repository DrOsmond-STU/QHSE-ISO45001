import { CapaCategory, CapaPriority, CapaRegister, CapaRegisterStatus, CapaSourceType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { CapaWorkflowBootstrapService } from "./capa-workflow-bootstrap.service";
export interface CreateCapaRegisterInput {
    sourceType: CapaSourceType;
    sourceId?: string;
    sourceReferenceNumber?: string;
    category: CapaCategory;
    priority: CapaPriority;
    title: string;
    problemStatement: string;
    siteId: string;
    departmentId?: string;
    targetClosureDate?: Date;
}
/**
 * Task 4.2 (Modul 10 §4 poin 1-2, §3 "Sistem (trigger otomatis)/User
 * manual | capa.register.create"). BELUM ada controller HTTP. BR-05 —
 * "source_type/source_id, jika diisi, wajib valid... divalidasi via
 * service call ke modul sumber saat create" — ditegakkan utk 9 dari 13
 * source_type dgn kontrak field KONKRET/tabel genuinely ada di codebase
 * ini (INCIDENT/AUDIT_FINDING/INSPECTION_FINDING sejak 4.2; QUALITY_NCR/
 * CUSTOMER_COMPLAINT ditambah task 5.1; ENVIRONMENTAL_ASPECT_IMPACT/
 * ENVIRONMENTAL_MONITORING ditambah task 5.2 — DUA nilai `CapaSourceType`
 * BARU krn enum asli task 4.2 (ditulis sebelum Modul 12 dikonsultasi) sama
 * sekali tidak menyediakan slot lingkungan, lihat banner comment blok
 * Modul 12 schema.prisma; OCCUPATIONAL_DISEASE_CASE ditambah task 5.3,
 * SATU nilai BARU lagi utk Modul 13 dgn alasan PERSIS sama — validasi ke
 * occupational_disease_cases, BUKAN ke kolom klinis di dalamnya (BR-10:
 * problemStatement CapaRegister WAJIB deskripsi sistemik non-identifiable,
 * TIDAK bisa ditegakkan dari sini — field bebas-teks, didisiplinkan proses/
 * UI, lihat banner comment schema.prisma blok Modul 13); CALIBRATION_OOT
 * ditambah task 6.2 (susulan saat dokumentasi/task 292, BUKAN saat skema
 * awal task 282 — gap TDD §26, kontrak baru ini genuinely kelihatan hanya
 * saat file ini ditinjau ulang cross-module) — validasi ke
 * out_of_tolerance_records, link caller-supplied via
 * OutOfToleranceRecordService.linkCapaRegister(), pola PERSIS
 * OCCUPATIONAL_DISEASE_CASE. COMPLIANCE/RISK/MANAGEMENT_REVIEW/OTHER TETAP
 * TIDAK divalidasi — PRD Modul 10 §7 eksplisit "kontrak integrasi resmi...
 * perlu difinalisasi saat dokumen2 tsb ditulis" (Modul 04/05), dan MESKI
 * Modul 04 (Compliance)/05 (Risk) SUDAH ada tabelnya sejak 2.2/3.1, PRD
 * Modul 10 §7 TIDAK PERNAH menyebut tabel target spesifik utk
 * source_type=COMPLIANCE/RISK (beda dari INCIDENT/AUDIT_FINDING/
 * INSPECTION_FINDING/QUALITY_NCR/ENVIRONMENTAL_* yang namanya SENDIRI
 * sudah menunjuk tabel konkret) — memvalidasi thd tabel tebakan (mis.
 * `risk_register` utk RISK) berarti MENGARANG kontrak yang PRD sendiri
 * belum tentukan, gap TDD §26 (kandidat closure lanjutan kalau PRD Modul
 * 10 §7 direvisi eksplisit).
 */
export declare class CapaRegisterService {
    private readonly prisma;
    private readonly numberingService;
    private readonly bootstrapService;
    constructor(prisma: PrismaService, numberingService: NumberingService, bootstrapService: CapaWorkflowBootstrapService);
    create(input: CreateCapaRegisterInput): Promise<CapaRegister>;
    private assertSourceValidIfKnownContract;
    markRootCauseAnalysisStarted(capaRegisterId: string): Promise<CapaRegister>;
    /**
     * Dipanggil CapaActionPlanWorkflowCompletionListener saat workflow
     * capa_action_plan APPROVED — status->IN_PROGRESS. approvedBy TIDAK
     * ADA kolom terpisah di capa_register (BEDA dari audit_programs) —
     * PRD §5 literal capa_register TIDAK py kolom approved_by/approved_at
     * sama sekali (hanya audit standar createdBy/updatedBy) — WorkflowInstanceCompletedEvent
     * tanpa field actor TETAP relevan utk konsistensi (tidak ada tempat
     * menaruhnya pun), TIDAK ditulis ke mana pun.
     *
     * workflowInstanceId WAJIB di-null-kan di sini juga (bukan hanya jalur
     * REJECTED) — kolom ini SATU pointer "current" dipakai BERGANTIAN oleh
     * DUA workflow proses (lihat banner comment blok Modul 10 schema.prisma).
     * Kalau dibiarkan non-null stale mengarah ke instance capa_action_plan
     * yang SUDAH APPROVED, CapaEffectivenessVerificationService.submitForApproval()
     * salah baca "masih ada workflow aktif" dan menolak submit — bug NYATA
     * yang baru ketahuan lewat integration test siklus penuh (task 4.2 §218),
     * TIDAK ketahuan di unit test murni krn keduanya diuji terisolasi.
     */
    markActionPlanApproved(capaRegisterId: string): Promise<CapaRegister>;
    returnToActionPlanDefined(capaRegisterId: string): Promise<CapaRegister>;
    /**
     * Dipanggil CapaEffectivenessVerificationWorkflowCompletionListener
     * saat workflow capa_effectiveness_verification APPROVED — status
     * final ditentukan `resolveEffectivenessOutcome(result)` (BR-01/BR-04)
     * thd `result` baris capa_effectiveness_verification yang baru saja
     * disetujui. actualClosureDate diisi HANYA kalau outcome EFFECTIVE_CLOSED.
     */
    markEffectivenessVerificationApproved(capaRegisterId: string, outcome: CapaRegisterStatus): Promise<CapaRegister>;
    returnToInProgress(capaRegisterId: string): Promise<CapaRegister>;
    cancel(capaRegisterId: string): Promise<CapaRegister>;
    reopen(capaRegisterId: string): Promise<CapaRegister>;
    getById(capaRegisterId: string): Promise<{
        rootCauseAnalyses: {
            method: import("@prisma/client").$Enums.CapaRootCauseMethod;
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            deletedAt: Date | null;
            capaRegisterId: string;
            analyzedBy: string;
            methodDetail: import("@prisma/client/runtime/library").JsonValue;
            rootCauseSummary: string;
            contributingFactors: string | null;
            analyzedAt: Date;
        }[];
        actionPlans: {
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            deletedAt: Date | null;
            capaRegisterId: string;
            rootCauseAnalysisId: string | null;
            actionDescription: string;
            justification: string;
            actionType: import("@prisma/client").$Enums.CapaActionType;
            picUserId: string;
            dueDate: Date;
            actionTrackingId: string | null;
            statusCache: import("@prisma/client").$Enums.CapaActionPlanStatusCache;
            completedDateCache: Date | null;
        }[];
        effectivenessVerifications: {
            id: string;
            result: import("@prisma/client").$Enums.CapaVerificationResult;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            deletedAt: Date | null;
            evidenceDescription: string | null;
            capaRegisterId: string;
            notes: string | null;
            verificationMethod: import("@prisma/client").$Enums.CapaVerificationMethod;
            observationPeriodDays: number;
            verificationDueDate: Date;
            verifiedBy: string;
            verifiedAt: Date | null;
            dueReminderSentAt: Date | null;
        }[];
        approvals: {
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            deletedAt: Date | null;
            comment: string | null;
            workflowInstanceId: string;
            capaRegisterId: string;
            approvalStage: string;
            decision: import("@prisma/client").$Enums.CapaApprovalDecision;
            decidedBy: string | null;
            decidedAt: Date | null;
        }[];
    } & {
        status: import("@prisma/client").$Enums.CapaRegisterStatus;
        priority: import("@prisma/client").$Enums.CapaPriority;
        id: string;
        tenantId: string;
        createdBy: string;
        createdAt: Date;
        updatedBy: string;
        updatedAt: Date;
        title: string;
        departmentId: string | null;
        siteId: string;
        deletedAt: Date | null;
        companyId: string;
        branchId: string | null;
        workflowInstanceId: string | null;
        targetClosureDate: Date | null;
        category: import("@prisma/client").$Enums.CapaCategory;
        actualClosureDate: Date | null;
        customFields: import("@prisma/client/runtime/library").JsonValue;
        capaNumber: string;
        sourceType: import("@prisma/client").$Enums.CapaSourceType;
        sourceId: string | null;
        sourceReferenceNumber: string | null;
        problemStatement: string;
        initiatedBy: string;
        initiatedAt: Date;
        rootCauseSlaReminderSentAt: Date | null;
    }>;
    listBySite(siteId: string): Promise<CapaRegister[]>;
    listBySource(sourceType: CapaSourceType, sourceId: string): Promise<CapaRegister[]>;
}
