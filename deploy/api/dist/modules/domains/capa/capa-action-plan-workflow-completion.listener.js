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
var CapaActionPlanWorkflowCompletionListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapaActionPlanWorkflowCompletionListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const workflow_engine_constants_1 = require("../../../platform/workflow-engine/workflow-engine.constants");
const capa_register_service_1 = require("./capa-register.service");
// Lihat banner comment CapaActionPlanService soal entityId=capa_register.id.
const CAPA_ACTION_PLAN_WORKFLOW_ENTITY_TYPE = "capa_action_plan";
/**
 * Task 4.2 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * capa_action_plan (pola PERSIS listener modul lain — payload-only, TIDAK
 * PERNAH re-query workflow_instances/workflow_tasks). APPROVED ->
 * CapaRegisterService.markActionPlanApproved() (status->IN_PROGRESS).
 * REJECTED -> returnToActionPlanDefined() (PIC redefine, workflow_
 * instance_id di-null-kan).
 *
 * TIDAK enqueue notifikasi di sini — PRD §8 baris "Action plan menunggu
 * approval" hanya utk SAAT SUBMIT (Workflow Engine 0.9 sendiri sudah
 * membuat workflow_tasks utk approver, pola sama Audit 4.1), TIDAK ADA
 * baris §8 "action plan disetujui/ditolak", gap TDD §26.
 */
let CapaActionPlanWorkflowCompletionListener = CapaActionPlanWorkflowCompletionListener_1 = class CapaActionPlanWorkflowCompletionListener {
    registerService;
    logger = new common_1.Logger(CapaActionPlanWorkflowCompletionListener_1.name);
    constructor(registerService) {
        this.registerService = registerService;
    }
    async onWorkflowInstanceCompleted(payload) {
        if (payload.entityType !== CAPA_ACTION_PLAN_WORKFLOW_ENTITY_TYPE)
            return;
        await tenant_context_1.tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
            try {
                if (payload.status === "APPROVED") {
                    await this.registerService.markActionPlanApproved(payload.entityId);
                }
                else if (payload.status === "REJECTED") {
                    await this.registerService.returnToActionPlanDefined(payload.entityId);
                }
            }
            catch (err) {
                this.logger.error(`Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk capa_action_plan (capa_register=${payload.entityId}): ${err instanceof Error ? err.message : err}`);
            }
        });
    }
};
exports.CapaActionPlanWorkflowCompletionListener = CapaActionPlanWorkflowCompletionListener;
__decorate([
    (0, event_emitter_1.OnEvent)(workflow_engine_constants_1.WORKFLOW_INSTANCE_COMPLETED_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CapaActionPlanWorkflowCompletionListener.prototype, "onWorkflowInstanceCompleted", null);
exports.CapaActionPlanWorkflowCompletionListener = CapaActionPlanWorkflowCompletionListener = CapaActionPlanWorkflowCompletionListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [capa_register_service_1.CapaRegisterService])
], CapaActionPlanWorkflowCompletionListener);
//# sourceMappingURL=capa-action-plan-workflow-completion.listener.js.map