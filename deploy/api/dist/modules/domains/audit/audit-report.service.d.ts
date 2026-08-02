import { AuditReport } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { AuditWorkflowBootstrapService } from "./audit-workflow-bootstrap.service";
import { AuditService } from "./audit.service";
export interface UpdateAuditReportContentInput {
    executiveSummary?: string;
    scopeDescription?: string;
    methodologyDescription?: string;
    conclusion?: string;
}
/**
 * Task 4.1 (Modul 09 §4 poin 7, §3 "Lead Auditor | audit.report.generate").
 * BELUM ada controller HTTP. Stage 1 workflow ("Review Lead Auditor")
 * CONTEXT_USER — contextData.contextUserId diisi dari audits.lead_auditor_id
 * SAAT submitForApproval() (bukan dari user yang submit), pola PERSIS
 * DocumentVersionService (2.1). audits.workflow_instance_id (kolom
 * denormalized, lihat banner comment Audit.workflowInstanceId di
 * schema.prisma) DITULIS BERSAMAAN dgn audit_reports.workflow_instance_id
 * di method yang SAMA supaya TIDAK PERNAH divergen.
 */
export declare class AuditReportService {
    private readonly prisma;
    private readonly bootstrapService;
    private readonly workflowEngineService;
    private readonly auditService;
    constructor(prisma: PrismaService, bootstrapService: AuditWorkflowBootstrapService, workflowEngineService: WorkflowEngineService, auditService: AuditService);
    create(auditId: string): Promise<AuditReport>;
    updateContent(auditReportId: string, input: UpdateAuditReportContentInput): Promise<AuditReport>;
    submitForApproval(auditReportId: string): Promise<AuditReport>;
    /**
     * Dipanggil AuditReportWorkflowCompletionListener saat workflow APPROVED
     * — approvedAt terisi, approvedBy SELALU NULL (WorkflowInstanceCompletedEvent
     * tidak punya field actor, pola sama seluruh listener modul lain), lalu
     * memicu AuditService.markReportApproved() (audits.status->REPORT_APPROVED/
     * PENDING_CAPA_CLOSURE).
     */
    markApproved(auditReportId: string): Promise<AuditReport>;
    /**
     * Dipanggil listener saat workflow REJECTED — workflow_instance_id
     * di-null-kan (audit_reports DAN audits, keduanya kolom denormalized yang
     * sama) utk resubmission. audits.status TETAP REPORT_DRAFTED (sudah benar
     * labelnya, tidak perlu transisi apa pun).
     */
    returnToDraft(auditReportId: string): Promise<AuditReport>;
    linkDocument(auditReportId: string, documentId: string): Promise<AuditReport>;
    getById(auditReportId: string): Promise<AuditReport>;
    getByAuditId(auditId: string): Promise<AuditReport | null>;
}
