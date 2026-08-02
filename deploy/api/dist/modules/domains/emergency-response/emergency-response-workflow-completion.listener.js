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
var EmergencyResponseWorkflowCompletionListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyResponseWorkflowCompletionListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const workflow_engine_constants_1 = require("../../../platform/workflow-engine/workflow-engine.constants");
const emergency_response_plan_service_1 = require("./emergency-response-plan.service");
const EMERGENCY_RESPONSE_PLAN_WORKFLOW_ENTITY_TYPE = "emergency_response_plan";
/**
 * Task 3.7 — KESEMBILAN KONSUMEN WORKFLOW_INSTANCE_COMPLETED_EVENT (pola
 * PERSIS listener modul lain — payload-only, TIDAK PERNAH re-query
 * workflow_instances/workflow_tasks, lihat banner comment
 * WorkflowInstanceCompletedEvent). APPROVED -> EmergencyResponsePlanService.markApprovedActive()
 * (status->APPROVED_ACTIVE + next_review_due_date dihitung BR-01). REJECTED
 * -> returnToDraft() (status->DRAFT, workflow_instance_id di-null-kan utk
 * resubmission, pola sama JSA 3.2).
 *
 * BEDA dari precedent: modul ini TIDAK enqueue notifikasi apa pun di sini —
 * PRD §8 tabel notifikasi Modul 14 TIDAK menyebutkan event "plan
 * disetujui/ditolak" sama sekali (5 baris §8 semuanya soal aktivasi/review-
 * overdue/drill/equipment, TIDAK ada baris "plan approved/rejected"), gap
 * TDD §26 — beda dari Incident/Work Permit yang PRD-nya eksplisit minta
 * notifikasi approval.
 */
let EmergencyResponseWorkflowCompletionListener = EmergencyResponseWorkflowCompletionListener_1 = class EmergencyResponseWorkflowCompletionListener {
    prisma;
    planService;
    logger = new common_1.Logger(EmergencyResponseWorkflowCompletionListener_1.name);
    constructor(prisma, planService) {
        this.prisma = prisma;
        this.planService = planService;
    }
    async onWorkflowInstanceCompleted(payload) {
        if (payload.entityType !== EMERGENCY_RESPONSE_PLAN_WORKFLOW_ENTITY_TYPE)
            return;
        await tenant_context_1.tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
            try {
                if (payload.status === "APPROVED") {
                    await this.planService.markApprovedActive(payload.entityId);
                }
                else if (payload.status === "REJECTED") {
                    await this.planService.returnToDraft(payload.entityId);
                }
            }
            catch (err) {
                this.logger.error(`Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk emergency_response_plan=${payload.entityId}: ${err instanceof Error ? err.message : err}`);
            }
        });
    }
};
exports.EmergencyResponseWorkflowCompletionListener = EmergencyResponseWorkflowCompletionListener;
__decorate([
    (0, event_emitter_1.OnEvent)(workflow_engine_constants_1.WORKFLOW_INSTANCE_COMPLETED_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmergencyResponseWorkflowCompletionListener.prototype, "onWorkflowInstanceCompleted", null);
exports.EmergencyResponseWorkflowCompletionListener = EmergencyResponseWorkflowCompletionListener = EmergencyResponseWorkflowCompletionListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        emergency_response_plan_service_1.EmergencyResponsePlanService])
], EmergencyResponseWorkflowCompletionListener);
//# sourceMappingURL=emergency-response-workflow-completion.listener.js.map