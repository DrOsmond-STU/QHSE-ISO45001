import { Prisma, WorkPermit, WorkPermitRiskLevel } from "@prisma/client";
import { ContractorDocumentComplianceService } from "../contractor/contractor-document-compliance.service";
import { ActOnTaskResult, WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { WorkPermitApprovalCacheService } from "./work-permit-approval-cache.service";
import { WorkPermitWorkflowBootstrapService } from "./work-permit-workflow-bootstrap.service";
export interface CreateWorkPermitInput {
    workPermitTypeId: string;
    siteId: string;
    departmentId?: string;
    title: string;
    description: string;
    locationDetail?: string;
    requesterId: string;
    contractorCompanyId?: string;
    relatedJsaId?: string;
    plannedStartDatetime: Date;
    plannedEndDatetime: Date;
    numberOfWorkers?: number;
    customFields?: Prisma.InputJsonValue;
}
export interface SubmitHazardChecklistInput {
    customFields: Prisma.InputJsonValue;
    allMandatoryItemsChecked: boolean;
}
export declare class WorkPermitService {
    private readonly prisma;
    private readonly numberingService;
    private readonly workflowEngineService;
    private readonly bootstrapService;
    private readonly approvalCacheService;
    private readonly contractorDocumentComplianceService;
    constructor(prisma: PrismaService, numberingService: NumberingService, workflowEngineService: WorkflowEngineService, bootstrapService: WorkPermitWorkflowBootstrapService, approvalCacheService: WorkPermitApprovalCacheService, contractorDocumentComplianceService: ContractorDocumentComplianceService);
    /**
     * BR-01 analog (permit_number) via NumberingService (0.10, module_code=
     * WORK_PERMIT, scope_level=SITE — lihat banner comment
     * WorkPermitWorkflowBootstrapService.ensureNumberingConfig()) — nomor
     * DIGENERATE SAAT CREATE (bukan ditunda sampai submitForApproval()),
     * pola PERSIS HiraAssessmentService/JsaRecordService/HiradcRecordService
     * (3.2); BR-01 literal cuma mensyaratkan nomor ADA sebelum status
     * keluar dari DRAFT, kompatibel dgn "digenerate lebih awal". risk_level
     * awal = work_permit_types.default_risk_level (PRD §4 poin 2) —
     * penyesuaian dari jawaban checklist TIDAK dimodelkan (PRD tidak
     * menyediakan mekanisme/skema konkret "jawaban X menaikkan level Y",
     * gap TDD §26); koreksi manual Issuer lewat correctRiskLevel() terpisah.
     * companyId/branchId didenormalisasi dari site (site SELALU sudah py
     * keduanya sejak dibuat, task 1.1).
     */
    create(input: CreateWorkPermitInput): Promise<WorkPermit>;
    /** 1:1 (unique workPermitId) — upsert menangani "isi pertama kali" DAN
     * "revisi sebelum submit" dgn satu method, pola sama beberapa checklist/
     * config 1:1 lain di codebase ini. */
    submitHazardChecklist(workPermitId: string, input: SubmitHazardChecklistInput): Promise<void>;
    /** PRD §4 poin 2 — "risk_level... dapat dikoreksi manual oleh Issuer pada
     * tahap review dengan jejak audit." Jejak audit terpenuhi lewat
     * audit_log_trigger generik (0.13, melekat seluruh tabel) + updatedBy —
     * TIDAK ADA tabel riwayat perubahan risk_level terpisah (skema literal
     * PRD §5 tidak memintanya). */
    correctRiskLevel(workPermitId: string, riskLevel: WorkPermitRiskLevel): Promise<WorkPermit>;
    getById(workPermitId: string): Promise<{
        gasTestResults: {
            id: string;
            result: import("@prisma/client").$Enums.GasTestResultValue;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            deletedAt: Date | null;
            notes: string | null;
            locationDetail: string | null;
            workPermitId: string;
            unit: string;
            gasType: import("@prisma/client").$Enums.GasType;
            readingValue: Prisma.Decimal;
            acceptableMin: Prisma.Decimal | null;
            acceptableMax: Prisma.Decimal | null;
            testDatetime: Date;
            retestDueAt: Date | null;
            instrumentName: string;
            instrumentCalibrationRef: string | null;
            testedBy: string;
        }[];
        isolationLotoRecords: {
            status: import("@prisma/client").$Enums.IsolationLotoStatus;
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            deletedAt: Date | null;
            workPermitId: string;
            verifiedBy: string | null;
            verifiedAt: Date | null;
            isolationPointDescription: string;
            isolationType: import("@prisma/client").$Enums.IsolationType;
            lockNumber: string | null;
            tagNumber: string | null;
            appliedBy: string;
            appliedAt: Date;
            removedBy: string | null;
            removedAt: Date | null;
        }[];
        hazardChecklist: {
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            deletedAt: Date | null;
            completedAt: Date | null;
            workPermitId: string;
            customFields: Prisma.JsonValue;
            allMandatoryItemsChecked: boolean;
            completedBy: string | null;
        } | null;
        approvalCache: {
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            deletedAt: Date | null;
            workflowInstanceId: string;
            workPermitId: string;
            rejectionReason: string | null;
            currentStageName: string | null;
            issuerApprovedBy: string | null;
            issuerApprovedAt: Date | null;
            hseApprovedBy: string | null;
            hseApprovedAt: Date | null;
            finalDecision: import("@prisma/client").$Enums.WorkPermitApprovalDecision;
        } | null;
    } & {
        status: import("@prisma/client").$Enums.WorkPermitStatus;
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
        companyId: string | null;
        branchId: string | null;
        workflowInstanceId: string | null;
        description: string;
        locationDetail: string | null;
        contractorCompanyId: string | null;
        customFields: Prisma.JsonValue;
        riskLevel: import("@prisma/client").$Enums.WorkPermitRiskLevel;
        relatedJsaId: string | null;
        permitNumber: string;
        workPermitTypeId: string;
        requesterId: string;
        plannedStartDatetime: Date;
        plannedEndDatetime: Date;
        actualStartDatetime: Date | null;
        actualEndDatetime: Date | null;
        numberOfWorkers: number | null;
    }>;
    /**
     * PRD §4 poin 3-4 — submit memicu workflow_instances (module_code=
     * WORK_PERMIT, entity_type=work_permit). BR-04 (hasHseStage) dihitung
     * dari work_permit_types.requires_hse_approval + work_permits.risk_level
     * SAAT INI (mencerminkan koreksi Issuer manapun via correctRiskLevel()
     * — bukan default_risk_level asli type). TIGA transaksi TERPISAH, alasan
     * PERSIS HiraAssessmentService.submitForApproval() (3.2).
     */
    submitForApproval(workPermitId: string): Promise<WorkPermit>;
    /**
     * BR-09 — wrapper WAJIB di atas WorkflowEngineService.actOnTask() generik
     * (yang HANYA cek "task.assignedTo===actingUserId", TIDAK tahu soal
     * requester entitas) supaya segregation-of-duty genuinely ditegakkan;
     * ROLE_IN_SCOPE tenant-wide (ApproverResolutionService, 0.9) SECARA
     * TEORETIS bisa meresolusi requester sendiri sbg approver kalau dia juga
     * pemegang role Supervisor/HSE Manager (site kecil). Sekaligus me-refresh
     * work_permit_approvals (cache read-model, task 135) — satu-satunya
     * titik lain selain submitForApproval()/WorkPermitWorkflowCompletionListener
     * yang genuinely memanggil actOnTask() utk entitas modul ini.
     */
    actOnApprovalTask(taskId: string, action: "APPROVE" | "REJECT", comment: string | undefined, actingUserId: string): Promise<ActOnTaskResult>;
    /**
     * PRD §4 poin 6-7 — "Verifikasi Keselamatan Pra-Aktivasi... Aktif —
     * status berpindah ke ACTIVE setelah seluruh syarat terpenuhi." BR-02/
     * BR-03 ditegakkan DI SINI (gate eksplisit, BUKAN otomatis begitu
     * APPROVED tercapai — PRD tidak menyebut auto-activate; "aktivasi"
     * dibaca sbg tindakan tersendiri, pola sama HiradcRecordService.approve()
     * 3.2 — lapis opsional lanjutan TANPA workflow tambahan).
     */
    activate(workPermitId: string): Promise<WorkPermit>;
    /**
     * BR-05 (PRD §6), penyelesaian LOOP — PRD sendiri tidak eksplisit
     * mendeskripsikan jalur keluar SUSPENDED, tapi permit yang SUSPENDED
     * selamanya tanpa jalur kembali bukan desain yang masuk akal (lihat
     * banner comment work-permit-lifecycle.ts). Gate: gas_test_results
     * TERBARU wajib result=PASS (retest baru genuinely direkam SETELAH
     * suspend — GasTestResultService.record() SELALU baris baru, tidak
     * pernah update baris lama). BEDA dari activate(): TIDAK menyentuh
     * actualStartDatetime (permit tidak "mulai" lagi, cuma resume) dan
     * TIDAK mengulang gate BR-02/BR-03 penuh (SUSPENDED->ACTIVE HANYA
     * butuh retest gas baru lolos, bukan verifikasi LOTO ulang).
     */
    resumeFromSuspension(workPermitId: string): Promise<WorkPermit>;
    cancel(workPermitId: string): Promise<WorkPermit>;
}
