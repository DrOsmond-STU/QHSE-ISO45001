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
var NcrWorkflowCompletionListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NcrWorkflowCompletionListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const workflow_engine_constants_1 = require("../../../platform/workflow-engine/workflow-engine.constants");
const ncr_record_service_1 = require("./ncr-record.service");
const NCR_WORKFLOW_ENTITY_TYPE = "ncr_record";
/**
 * Task 5.1 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * ncr_record. Payload-only (TIDAK re-query ncr_records — tidak ada data
 * tambahan yang dibutuhkan selain payload.entityId/status sendiri, pola
 * PERSIS CapaActionPlanWorkflowCompletionListener 4.2). APPROVED (SELURUH
 * 3 stage: Review Supervisor->Approval Disposisi Quality Manager->
 * Verifikasi Penutupan) -> DISPOSITION_PENDING->DISPOSITIONED. REJECTED
 * (di stage manapun) -> kembali CONTAINMENT (disposisi diajukan ulang).
 */
let NcrWorkflowCompletionListener = NcrWorkflowCompletionListener_1 = class NcrWorkflowCompletionListener {
    ncrRecordService;
    logger = new common_1.Logger(NcrWorkflowCompletionListener_1.name);
    constructor(ncrRecordService) {
        this.ncrRecordService = ncrRecordService;
    }
    async onWorkflowInstanceCompleted(payload) {
        if (payload.entityType !== NCR_WORKFLOW_ENTITY_TYPE)
            return;
        await tenant_context_1.tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
            try {
                if (payload.status === "APPROVED") {
                    await this.ncrRecordService.markDispositionApproved(payload.entityId);
                }
                else if (payload.status === "REJECTED") {
                    await this.ncrRecordService.returnToContainment(payload.entityId);
                }
            }
            catch (err) {
                this.logger.error(`Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk ncr_record=${payload.entityId}: ${err instanceof Error ? err.message : err}`);
            }
        });
    }
};
exports.NcrWorkflowCompletionListener = NcrWorkflowCompletionListener;
__decorate([
    (0, event_emitter_1.OnEvent)(workflow_engine_constants_1.WORKFLOW_INSTANCE_COMPLETED_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NcrWorkflowCompletionListener.prototype, "onWorkflowInstanceCompleted", null);
exports.NcrWorkflowCompletionListener = NcrWorkflowCompletionListener = NcrWorkflowCompletionListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [ncr_record_service_1.NcrRecordService])
], NcrWorkflowCompletionListener);
