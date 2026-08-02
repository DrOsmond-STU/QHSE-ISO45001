import { CapaActionPlan, CapaActionType, CapaRegister } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { CapaWorkflowBootstrapService } from "./capa-workflow-bootstrap.service";
import { CapaRegisterService } from "./capa-register.service";
import { CapaApprovalCacheService } from "./capa-approval-cache.service";
export interface DefineCapaActionPlanInput {
    capaRegisterId: string;
    rootCauseAnalysisId?: string;
    actionDescription: string;
    justification: string;
    actionType: CapaActionType;
    picUserId: string;
    dueDate: Date;
}
/**
 * Task 4.2 (Modul 10 §4 poin 4-5, §3 "CAPA Owner/PIC | capa.action_plan.define,
 * capa.action_plan.link_action_tracking"). BELUM ada controller HTTP.
 */
export declare class CapaActionPlanService {
    private readonly prisma;
    private readonly bootstrapService;
    private readonly workflowEngineService;
    private readonly registerService;
    private readonly approvalCacheService;
    constructor(prisma: PrismaService, bootstrapService: CapaWorkflowBootstrapService, workflowEngineService: WorkflowEngineService, registerService: CapaRegisterService, approvalCacheService: CapaApprovalCacheService);
    define(input: DefineCapaActionPlanInput): Promise<CapaActionPlan>;
    private markActionPlanDefined;
    setActionTrackingId(capaActionPlanId: string, actionTrackingId: string): Promise<CapaActionPlan>;
    updateStatusCache(capaActionPlanId: string, statusCache: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE", completedDate?: Date): Promise<CapaActionPlan>;
    submitForApproval(capaRegisterId: string): Promise<CapaRegister>;
    getById(capaActionPlanId: string): Promise<CapaActionPlan>;
    listByCapa(capaRegisterId: string): Promise<CapaActionPlan[]>;
}
