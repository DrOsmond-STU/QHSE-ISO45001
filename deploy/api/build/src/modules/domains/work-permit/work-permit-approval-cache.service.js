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
exports.WorkPermitApprovalCacheService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const work_permit_context_1 = require("./work-permit-context");
/**
 * Task 3.3 — `work_permit_approvals` adalah CACHE/read-model (PRD §5
 * eksplisit "BUKAN pengganti Workflow Engine, sumber kebenaran tetap
 * workflow_instances/workflow_tasks"). `refresh()` membaca STATE SAAT INI
 * dari kedua tabel itu (bukan event-driven per-stage — `WorkflowEngineService`
 * 0.9 TIDAK emit event apa pun selain `WORKFLOW_INSTANCE_COMPLETED_EVENT`
 * saat TERMINAL, tidak ada hook "stage advanced") dan meng-upsert SATU
 * baris per permit. Dipanggil dari `WorkPermitService.submitForApproval()`
 * (baris awal, `finalDecision=PENDING`) + `WorkPermitService.actOnApprovalTask()`
 * (SETIAP approve/reject stage manapun, mid-flow MAUPUN terminal) +
 * `WorkPermitWorkflowCompletionListener` (jaring pengaman kalau caller
 * lupa refresh manual). SELAMA caller SELALU lewat `actOnApprovalTask()`
 * (BUKAN langsung `WorkflowEngineService.actOnTask()`), cache ini SELALU
 * segar — staleness HANYA muncul kalau ada pemanggil lain yang melewati
 * wrapper itu (mis. controller masa depan yang lupa memakainya) — gap
 * TDD §26.
 */
let WorkPermitApprovalCacheService = class WorkPermitApprovalCacheService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async refresh(workPermitId) {
        const tenantId = (0, work_permit_context_1.requireTenantId)();
        await this.prisma.withRls(async (tx) => {
            const permit = await tx.workPermit.findUniqueOrThrow({ where: { id: workPermitId }, select: { workflowInstanceId: true } });
            if (!permit.workflowInstanceId)
                return;
            const instance = await tx.workflowInstance.findUniqueOrThrow({ where: { id: permit.workflowInstanceId } });
            const tasks = await tx.workflowTask.findMany({
                where: { instanceId: instance.id },
                include: { stage: true },
                orderBy: { createdAt: "asc" },
            });
            if (tasks.length === 0)
                return;
            // Stage 1 = Issuer/Area Authority, Stage 2 = HSE (kondisional BR-04)
            // — diidentifikasi via sequenceNo (bukan name-matching string yang
            // rapuh), lihat WorkPermitWorkflowBootstrapService.ensureWorkflowDefinition().
            const issuerTask = tasks.find((t) => t.stage.sequenceNo === 1 && t.status === "APPROVED");
            const hseTask = tasks.find((t) => t.stage.sequenceNo === 2 && t.status === "APPROVED");
            const rejectedTask = tasks.find((t) => t.status === "REJECTED");
            let currentStageName = null;
            if (instance.status === "IN_PROGRESS" && instance.currentStageId) {
                const stage = await tx.workflowStage.findUnique({ where: { id: instance.currentStageId } });
                currentStageName = stage?.stageName ?? null;
            }
            const finalDecision = instance.status === "APPROVED" ? "APPROVED" : instance.status === "REJECTED" ? "REJECTED" : "PENDING";
            await tx.workPermitApproval.upsert({
                where: { workPermitId },
                create: {
                    tenantId,
                    workPermitId,
                    workflowInstanceId: instance.id,
                    currentStageName,
                    issuerApprovedBy: issuerTask?.actedBy ?? null,
                    issuerApprovedAt: issuerTask?.actedAt ?? null,
                    hseApprovedBy: hseTask?.actedBy ?? null,
                    hseApprovedAt: hseTask?.actedAt ?? null,
                    finalDecision,
                    rejectionReason: rejectedTask?.comment ?? null,
                    createdBy: tasks[0].assignedTo,
                    updatedBy: tasks[0].assignedTo,
                },
                update: {
                    currentStageName,
                    issuerApprovedBy: issuerTask?.actedBy ?? null,
                    issuerApprovedAt: issuerTask?.actedAt ?? null,
                    hseApprovedBy: hseTask?.actedBy ?? null,
                    hseApprovedAt: hseTask?.actedAt ?? null,
                    finalDecision,
                    rejectionReason: rejectedTask?.comment ?? null,
                },
            });
        });
    }
};
exports.WorkPermitApprovalCacheService = WorkPermitApprovalCacheService;
exports.WorkPermitApprovalCacheService = WorkPermitApprovalCacheService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WorkPermitApprovalCacheService);
