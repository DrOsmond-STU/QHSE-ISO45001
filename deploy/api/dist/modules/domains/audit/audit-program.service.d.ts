import { AuditProgram, AuditProgramPlanItem } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { AuditWorkflowBootstrapService } from "./audit-workflow-bootstrap.service";
export interface CreateAuditProgramPlanItemInput {
    plannedMonth: number;
    auditTypeId: string;
    siteId?: string;
    departmentId?: string;
    standardReference: string;
    plannedLeadAuditorId?: string;
}
export interface CreateAuditProgramInput {
    companyId: string;
    branchId?: string;
    programYear: number;
    name: string;
    objective?: string;
    planItems: CreateAuditProgramPlanItemInput[];
}
/**
 * Task 4.1 (Modul 09 §4 poin 1, §3 "Audit Program Owner/MR |
 * audit.program.create"). BELUM ada controller HTTP. audit_programs TIDAK
 * punya status bisnis "UNDER_REVIEW" terpisah (lihat banner comment
 * audit-program-lifecycle.ts) — submitForApproval() TIDAK mengubah status
 * (tetap DRAFT), hanya mengisi workflowInstanceId; AuditProgramWorkflowCompletionListener
 * (task 197) yang mengubah status jadi APPROVED saat workflow selesai.
 */
export declare class AuditProgramService {
    private readonly prisma;
    private readonly bootstrapService;
    private readonly workflowEngineService;
    constructor(prisma: PrismaService, bootstrapService: AuditWorkflowBootstrapService, workflowEngineService: WorkflowEngineService);
    create(input: CreateAuditProgramInput): Promise<AuditProgram>;
    addPlanItem(auditProgramId: string, input: CreateAuditProgramPlanItemInput): Promise<AuditProgramPlanItem>;
    private createPlanItems;
    submitForApproval(auditProgramId: string): Promise<AuditProgram>;
    /**
     * Dipanggil AuditProgramWorkflowCompletionListener saat workflow APPROVED
     * — status->APPROVED. approvedBy SELALU NULL (WorkflowInstanceCompletedEvent
     * tidak punya field actor, re-query workflow_tasks dilarang, pola sama
     * EmergencyResponsePlan.markApprovedActive 3.7).
     */
    markApprovedActive(auditProgramId: string): Promise<AuditProgram>;
    /**
     * Dipanggil listener saat workflow REJECTED — status TETAP DRAFT (enum
     * tidak py nilai REJECTED, lihat banner comment audit-program-lifecycle.ts),
     * workflow_instance_id di-null-kan utk resubmission, pola sama JSA 3.2.
     */
    returnToDraft(auditProgramId: string): Promise<AuditProgram>;
    cancel(auditProgramId: string): Promise<AuditProgram>;
    getById(auditProgramId: string): Promise<{
        planItems: {
            status: import("@prisma/client").$Enums.AuditProgramPlanItemStatus;
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            departmentId: string | null;
            siteId: string | null;
            deletedAt: Date | null;
            auditTypeId: string;
            auditProgramId: string;
            plannedMonth: number;
            standardReference: string;
            plannedLeadAuditorId: string | null;
            linkedAuditId: string | null;
        }[];
    } & {
        status: import("@prisma/client").$Enums.AuditProgramStatus;
        name: string;
        id: string;
        tenantId: string;
        createdBy: string;
        createdAt: Date;
        updatedBy: string;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        branchId: string | null;
        workflowInstanceId: string | null;
        programYear: number;
        objective: string | null;
        approvedBy: string | null;
        approvedAt: Date | null;
    }>;
    listByCompany(companyId: string): Promise<AuditProgram[]>;
}
