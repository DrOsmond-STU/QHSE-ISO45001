import { EventEmitter2 } from "@nestjs/event-emitter";
import { WorkflowInstance, WorkflowTask, WorkflowTaskAction } from "@prisma/client";
import { PrismaService } from "../tenancy/prisma.service";
import { ApproverResolutionService } from "./approver-resolution.service";
export interface ActOnTaskResult {
    alreadyProcessed: boolean;
    task: WorkflowTask;
}
export declare class WorkflowEngineService {
    private readonly prisma;
    private readonly approverResolutionService;
    private readonly eventEmitter;
    constructor(prisma: PrismaService, approverResolutionService: ApproverResolutionService, eventEmitter: EventEmitter2);
    startInstance(entityType: string, entityId: string, workflowDefinitionId: string, contextData?: Record<string, unknown>): Promise<WorkflowInstance>;
    /**
     * Idempotent thd double-submit (TDD §9): row lock (SELECT ... FOR UPDATE)
     * lalu cek status sudah bukan PENDING sebelum proses. Panggilan kedua yang
     * konkuren blok di lock sampai panggilan pertama commit, lalu baca status
     * yang sudah berubah dan no-op dengan aman.
     */
    actOnTask(taskId: string, action: Extract<WorkflowTaskAction, "APPROVE" | "REJECT">, comment: string | undefined, actingUserId: string): Promise<ActOnTaskResult>;
    evaluateTransition(instanceId: string): Promise<{
        stageComplete: boolean;
    }>;
    private evaluateTransitionInTx;
    private createTasksForStage;
}
