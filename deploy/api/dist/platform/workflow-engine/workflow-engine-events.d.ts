import { WorkflowEscalationAction, WorkflowInstanceStatus } from "@prisma/client";
export interface WorkflowTaskEscalatedEvent {
    taskId: string;
    instanceId: string;
    tenantId: string;
    action: WorkflowEscalationAction;
    reassignedToRoleId: string | null;
}
export interface WorkflowInstanceCompletedEvent {
    instanceId: string;
    tenantId: string;
    status: WorkflowInstanceStatus;
    entityType: string;
    entityId: string;
}
