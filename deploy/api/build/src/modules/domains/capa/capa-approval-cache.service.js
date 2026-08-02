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
exports.CapaApprovalCacheService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const capa_context_1 = require("./capa-context");
/**
 * Task 4.2 — `capa_approvals` adalah CACHE/read-model (PRD §5 eksplisit
 * "Sumber kebenaran tetap workflow_instances/workflow_tasks", pola PERSIS
 * `work_permit_approvals` 3.3) — TAPI BEDA BENTUK: `work_permit_approvals`
 * SATU baris tetap per permit (kolom bernama per-stage tetap, krn selalu
 * tepat 2 stage); `capa_approvals` **1..N baris PER capa_register (SATU
 * baris per workflow_instance)** krn PRD §5 ERD literal sendiri bilang
 * "1..N capa_approvals (cache tiap stage)" — CAPA py DUA workflow process
 * TERPISAH (capa_action_plan, capa_effectiveness_verification) yang bisa
 * masing2 disubmit ULANG (reject->resubmit) sepanjang siklus hidup CAPA,
 * jadi upsert dilakukan per `workflowInstanceId` (`@unique`), BUKAN per
 * `capaRegisterId`.
 */
let CapaApprovalCacheService = class CapaApprovalCacheService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async refresh(capaRegisterId, workflowInstanceId, approvalStage) {
        const tenantId = (0, capa_context_1.requireTenantId)();
        await this.prisma.withRls(async (tx) => {
            const instance = await tx.workflowInstance.findUniqueOrThrow({ where: { id: workflowInstanceId } });
            const tasks = await tx.workflowTask.findMany({ where: { instanceId: instance.id }, orderBy: { createdAt: "asc" } });
            const actedTask = tasks.find((t) => t.status === "APPROVED" || t.status === "REJECTED");
            const decision = instance.status === "APPROVED" ? "APPROVED" : instance.status === "REJECTED" ? "REJECTED" : "PENDING";
            const fallbackActor = tasks[0]?.assignedTo ?? (0, capa_context_1.requireActorUserId)();
            await tx.capaApproval.upsert({
                where: { workflowInstanceId },
                create: {
                    tenantId,
                    capaRegisterId,
                    approvalStage,
                    workflowInstanceId,
                    decision,
                    decidedBy: actedTask?.actedBy ?? null,
                    decidedAt: actedTask?.actedAt ?? null,
                    comment: actedTask?.comment ?? null,
                    createdBy: fallbackActor,
                    updatedBy: fallbackActor,
                },
                update: {
                    decision,
                    decidedBy: actedTask?.actedBy ?? null,
                    decidedAt: actedTask?.actedAt ?? null,
                    comment: actedTask?.comment ?? null,
                    updatedBy: fallbackActor,
                },
            });
        });
    }
    async listByCapa(capaRegisterId) {
        return this.prisma.withRls((tx) => tx.capaApproval.findMany({ where: { capaRegisterId, deletedAt: null }, orderBy: { createdAt: "asc" } }));
    }
};
exports.CapaApprovalCacheService = CapaApprovalCacheService;
exports.CapaApprovalCacheService = CapaApprovalCacheService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CapaApprovalCacheService);
