import { Audit } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { AuditWorkflowBootstrapService } from "./audit-workflow-bootstrap.service";
export interface CreateAuditInput {
    siteId: string;
    auditTypeId: string;
    auditChecklistId: string;
    leadAuditorId: string;
    plannedStartDate: Date;
    plannedEndDate: Date;
}
export interface AuditStartResult {
    audit: Audit;
    competencyWarnings: string[];
}
/**
 * Task 4.1 (Modul 09 §4 poin 2/5, §3 "Audit Program Owner/MR |
 * audit.audit.schedule"). BELUM ada controller HTTP. companyId/branchId
 * SELALU diturunkan dari site (bukan input caller terpisah), pola PERSIS
 * InspectionRecordService (3.6) — "lokasi auditee" (PRD §5) sepenuhnya
 * ditentukan site-nya.
 */
export declare class AuditService {
    private readonly prisma;
    private readonly numberingService;
    private readonly bootstrapService;
    constructor(prisma: PrismaService, numberingService: NumberingService, bootstrapService: AuditWorkflowBootstrapService);
    /**
     * PRD §4 poin 2 "Dari setiap audit_program_plan_items, dibuat instance
     * audits." linked_audit_id (plan item) + audit_program_plan_item_id
     * (audit) diisi ATOMIK dalam TRANSAKSI KEDUA (setelah baris audits
     * genuinely ada, krn linked_audit_id butuh FK ke audit.id yang baru
     * dibuat) — TIDAK atomik lintas KEDUA transaksi (create audit vs update
     * plan item), gap TDD §26 konsisten pola "tidak atomik lintas langkah"
     * (DMS 2.1, dst). APPROVED->IN_PROGRESS pada audit_programs induk
     * (side-effect "audit pertama dibuat dari program ini") DIGABUNG di
     * transaksi kedua yang sama.
     */
    createFromPlanItem(auditProgramPlanItemId: string, input: CreateAuditInput): Promise<Audit>;
    createAdHoc(input: CreateAuditInput): Promise<Audit>;
    private createAuditRow;
    start(auditId: string): Promise<AuditStartResult>;
    recordOpeningMeeting(auditId: string, input: {
        datetime: Date;
        notes?: string;
    }): Promise<Audit>;
    recordClosingMeeting(auditId: string, input: {
        datetime: Date;
        notes?: string;
    }): Promise<Audit>;
    markReportDrafted(auditId: string): Promise<Audit>;
    /**
     * Dipanggil AuditReportWorkflowCompletionListener saat workflow
     * audit_report APPROVED. PRD TIDAK beri trigger manual eksplisit utk
     * status PENDING_CAPA_CLOSURE (§5 enum literal py nilai ini tapi §4 TIDAK
     * jelaskan siapa/kapan men-set-nya) — diderivasi OTOMATIS di sini:
     * REPORT_APPROVED SELALU disentuh dulu (status transition jujur), lalu
     * kalau MASIH ada audit_findings wajib-CAPA belum CLOSED, LANGSUNG
     * lanjut ke PENDING_CAPA_CLOSURE sbg langkah kedua internal (bukan
     * transisi manual terpisah) — interpretasi, gap TDD §26.
     */
    markReportApproved(auditId: string): Promise<Audit>;
    close(auditId: string): Promise<Audit>;
    cancel(auditId: string): Promise<Audit>;
    getById(auditId: string): Promise<{
        findings: {
            status: import("@prisma/client").$Enums.AuditFindingStatus;
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            deletedAt: Date | null;
            auditId: string;
            clauseReference: string | null;
            checklistItemId: string | null;
            findingNumber: string;
            classification: import("@prisma/client").$Enums.AuditFindingClassification;
            description: string;
            evidenceDescription: string | null;
            auditeeResponse: string | null;
            requiresCapa: boolean;
            capaRegisterId: string | null;
            identifiedBy: string;
            identifiedAt: Date;
            targetClosureDate: Date | null;
            closedAt: Date | null;
        }[];
        teamMembers: {
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            deletedAt: Date | null;
            userId: string;
            auditId: string;
            roleInTeam: import("@prisma/client").$Enums.AuditTeamRole;
        }[];
        auditeeScopes: {
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            departmentId: string | null;
            deletedAt: Date | null;
            auditId: string;
            processArea: string | null;
        }[];
        report: {
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            deletedAt: Date | null;
            auditId: string;
            workflowInstanceId: string | null;
            approvedBy: string | null;
            approvedAt: Date | null;
            executiveSummary: string | null;
            scopeDescription: string | null;
            methodologyDescription: string | null;
            conclusion: string | null;
            totalMajorNc: number;
            totalMinorNc: number;
            totalObservation: number;
            totalOfi: number;
            preparedBy: string;
            preparedAt: Date;
            documentId: string | null;
        } | null;
    } & {
        status: import("@prisma/client").$Enums.AuditStatus;
        id: string;
        tenantId: string;
        createdBy: string;
        createdAt: Date;
        updatedBy: string;
        updatedAt: Date;
        siteId: string;
        deletedAt: Date | null;
        auditChecklistId: string;
        auditNumber: string;
        auditProgramPlanItemId: string | null;
        auditTypeId: string;
        companyId: string;
        branchId: string | null;
        leadAuditorId: string;
        plannedStartDate: Date;
        plannedEndDate: Date;
        actualStartDate: Date | null;
        actualEndDate: Date | null;
        openingMeetingDatetime: Date | null;
        openingMeetingNotes: string | null;
        closingMeetingDatetime: Date | null;
        closingMeetingNotes: string | null;
        overallConclusion: string | null;
        workflowInstanceId: string | null;
    }>;
    listBySite(siteId: string): Promise<Audit[]>;
}
