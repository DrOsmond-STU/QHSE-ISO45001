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
var EnvironmentalAspectReviewWorkflowCompletionListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentalAspectReviewWorkflowCompletionListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const workflow_engine_constants_1 = require("../../../platform/workflow-engine/workflow-engine.constants");
const environmental_aspect_impact_service_1 = require("./environmental-aspect-impact.service");
const ASPECT_REVIEW_WORKFLOW_ENTITY_TYPE = "environmental_aspect_impact";
/**
 * Task 5.2 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * environmental_aspect_impact (workflow ENV_ASPECT_REVIEW 2-stage). Payload-only,
 * pola PERSIS NcrWorkflowCompletionListener 5.1. APPROVED -> UNDER_REVIEW->ACTIVE
 * (BR-01 ditegakkan di markApproved()). REJECTED -> kembali DRAFT.
 */
let EnvironmentalAspectReviewWorkflowCompletionListener = EnvironmentalAspectReviewWorkflowCompletionListener_1 = class EnvironmentalAspectReviewWorkflowCompletionListener {
    aspectImpactService;
    logger = new common_1.Logger(EnvironmentalAspectReviewWorkflowCompletionListener_1.name);
    constructor(aspectImpactService) {
        this.aspectImpactService = aspectImpactService;
    }
    async onWorkflowInstanceCompleted(payload) {
        if (payload.entityType !== ASPECT_REVIEW_WORKFLOW_ENTITY_TYPE)
            return;
        await tenant_context_1.tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
            try {
                if (payload.status === "APPROVED") {
                    await this.aspectImpactService.markApproved(payload.entityId);
                }
                else if (payload.status === "REJECTED") {
                    await this.aspectImpactService.returnToDraft(payload.entityId);
                }
            }
            catch (err) {
                this.logger.error(`Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk environmental_aspect_impact=${payload.entityId}: ${err instanceof Error ? err.message : err}`);
            }
        });
    }
};
exports.EnvironmentalAspectReviewWorkflowCompletionListener = EnvironmentalAspectReviewWorkflowCompletionListener;
__decorate([
    (0, event_emitter_1.OnEvent)(workflow_engine_constants_1.WORKFLOW_INSTANCE_COMPLETED_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EnvironmentalAspectReviewWorkflowCompletionListener.prototype, "onWorkflowInstanceCompleted", null);
exports.EnvironmentalAspectReviewWorkflowCompletionListener = EnvironmentalAspectReviewWorkflowCompletionListener = EnvironmentalAspectReviewWorkflowCompletionListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [environmental_aspect_impact_service_1.EnvironmentalAspectImpactService])
], EnvironmentalAspectReviewWorkflowCompletionListener);
//# sourceMappingURL=environmental-aspect-review-workflow-completion.listener.js.map