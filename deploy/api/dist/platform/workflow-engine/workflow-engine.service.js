"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowEngineService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../tenancy/prisma.service");
const tenant_context_1 = require("../tenancy/tenant-context");
const approver_resolution_service_1 = require("./approver-resolution.service");
const workflow_engine_constants_1 = require("./workflow-engine.constants");
const workflow_transition_evaluation_1 = require("./workflow-transition-evaluation");
function requireTenantId() {
    const tenantId = (0, tenant_context_1.getCurrentTenantId)();
    if (!tenantId) {
        throw new Error("Tenant context tidak ditemukan — request ditolak (fail closed).");
    }
    return tenantId;
}
let WorkflowEngineService = class WorkflowEngineService {
    prisma;
    approverResolutionService;
    eventEmitter;
    constructor(prisma, approverResolutionService, eventEmitter) {
        this.prisma = prisma;
        this.approverResolutionService = approverResolutionService;
        this.eventEmitter = eventEmitter;
    }
    async startInstance(entityType, entityId, workflowDefinitionId, contextData = {}) {
        const tenantId = requireTenantId();
        return this.prisma.withRls(async (tx) => {
            const firstStage = await tx.workflowStage.findFirstOrThrow({
                where: { workflowDefinitionId },
                orderBy: { sequenceNo: "asc" },
            });
            const instance = await tx.workflowInstance.create({
                data: {
                    tenantId,
                    workflowDefinitionId,
                    entityType,
                    entityId,
                    currentStageId: firstStage.id,
                    contextData: contextData,
                    status: "IN_PROGRESS",
                },
            });
            await this.createTasksForStage(tx, instance.id, firstStage.id, tenantId, instance.contextData);
            return instance;
        });
    }
    /**
     * Idempotent thd double-submit (TDD §9): row lock (SELECT ... FOR UPDATE)
     * lalu cek status sudah bukan PENDING sebelum proses. Panggilan kedua yang
     * konkuren blok di lock sampai panggilan pertama commit, lalu baca status
     * yang sudah berubah dan no-op dengan aman.
     */
    async actOnTask(taskId, action, comment, actingUserId) {
        const tenantId = requireTenantId();
        return this.prisma.withRls(async (tx) => {
            // withRls() sudah SET LOCAL app.current_tenant_id di transaksi ini —
            // RLS ikut membatasi raw lock query ini juga (taskId lintas tenant
            // otomatis tidak terlihat, bukan cuma unauthorized). Prisma belum
            // punya .forUpdate() bawaan, jadi raw:
            await tx.$queryRaw `SELECT task_id FROM workflow_tasks WHERE task_id = ${taskId}::uuid FOR UPDATE`;
            const task = await tx.workflowTask.findUniqueOrThrow({ where: { id: taskId } });
            if (task.status !== "PENDING") {
                return { alreadyProcessed: true, task };
            }
            if (task.assignedTo !== actingUserId) {
                throw new common_1.ForbiddenException("Anda bukan assignee task ini.");
            }
            const updated = await tx.workflowTask.update({
                where: { id: taskId },
                data: {
                    status: action === "APPROVE" ? "APPROVED" : "REJECTED",
                    actedAt: new Date(),
                    actedBy: actingUserId,
                    comment,
                },
            });
            await this.evaluateTransitionInTx(tx, task.instanceId, tenantId);
            return { alreadyProcessed: false, task: updated };
        });
    }
    async evaluateTransition(instanceId) {
        const tenantId = requireTenantId();
        return this.prisma.withRls((tx) => this.evaluateTransitionInTx(tx, instanceId, tenantId));
    }
    async evaluateTransitionInTx(tx, instanceId, tenantId) {
        const instance = await tx.workflowInstance.findUniqueOrThrow({ where: { id: instanceId } });
        if (instance.status !== "IN_PROGRESS" || !instance.currentStageId) {
            return { stageComplete: false };
        }
        const stage = await tx.workflowStage.findUniqueOrThrow({ where: { id: instance.currentStageId } });
        const siblingTasks = await tx.workflowTask.findMany({ where: { instanceId, stageId: stage.id } });
        const completion = (0, workflow_transition_evaluation_1.evaluateStageCompletion)(siblingTasks.map((t) => t.status), stage.parallelCompletionRule ?? "ALL_APPROVE");
        if (!completion.complete || completion.outcome === null) {
            return { stageComplete: false };
        }
        const triggerAction = completion.outcome === "APPROVE" ? "APPROVE" : "REJECT";
        const transitionRows = await tx.workflowTransition.findMany({ where: { fromStageId: stage.id } });
        const candidates = transitionRows.map((t) => ({
            id: t.id,
            triggerAction: t.triggerAction,
            condition: t.condition,
            priority: t.priority,
            toStageId: t.toStageId,
            resultStatus: t.resultStatus,
        }));
        const picked = (0, workflow_transition_evaluation_1.pickTransition)(candidates, triggerAction, instance.contextData ?? {});
        if (!picked) {
            throw new Error(`Tidak ada workflow_transitions yang cocok dari stage ${stage.id} untuk aksi ${triggerAction} (config workflow tidak lengkap).`);
        }
        if (picked.toStageId) {
            await tx.workflowInstance.update({ where: { id: instanceId }, data: { currentStageId: picked.toStageId } });
            await this.createTasksForStage(tx, instanceId, picked.toStageId, tenantId, instance.contextData);
            return { stageComplete: true };
        }
        const finalStatus = picked.resultStatus ?? (triggerAction === "APPROVE" ? "APPROVED" : "REJECTED");
        await tx.workflowInstance.update({
            where: { id: instanceId },
            data: { status: finalStatus, completedAt: new Date(), currentStageId: null },
        });
        this.eventEmitter.emit(workflow_engine_constants_1.WORKFLOW_INSTANCE_COMPLETED_EVENT, {
            instanceId,
            tenantId,
            status: finalStatus,
            entityType: instance.entityType,
            entityId: instance.entityId,
        });
        return { stageComplete: true };
    }
    async createTasksForStage(tx, instanceId, stageId, tenantId, contextData) {
        const stage = await tx.workflowStage.findUniqueOrThrow({ where: { id: stageId } });
        const approverIds = await this.approverResolutionService.resolveApprovers(tx, stage, tenantId, contextData ?? undefined);
        if (approverIds.length === 0) {
            throw new Error(`Tidak ada approver ditemukan untuk stage ${stageId} (${stage.stageName}).`);
        }
        await tx.workflowTask.createMany({
            data: approverIds.map((userId) => ({
                tenantId,
                instanceId,
                stageId,
                assignedTo: userId,
                status: "PENDING",
            })),
        });
    }
};
exports.WorkflowEngineService = WorkflowEngineService;
exports.WorkflowEngineService = WorkflowEngineService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        approver_resolution_service_1.ApproverResolutionService,
        event_emitter_1.EventEmitter2])
], WorkflowEngineService);
//# sourceMappingURL=workflow-engine.service.js.map