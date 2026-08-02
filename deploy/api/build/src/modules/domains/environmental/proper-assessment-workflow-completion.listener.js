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
var ProperAssessmentWorkflowCompletionListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProperAssessmentWorkflowCompletionListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const workflow_engine_constants_1 = require("../../../platform/workflow-engine/workflow-engine.constants");
const proper_self_assessment_service_1 = require("./proper-self-assessment.service");
const PROPER_ASSESSMENT_WORKFLOW_ENTITY_TYPE = "proper_self_assessment";
/**
 * Task 5.2 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * proper_self_assessment (workflow ENV_PROPER_ASSESSMENT 2-stage). Payload-only,
 * pola PERSIS listener domain lain. APPROVED -> tutup workflow_instance_id
 * (submission_status sudah INTERNAL_REVIEWED sejak submit, lihat banner
 * comment ProperSelfAssessmentService). REJECTED -> kembali DRAFT.
 */
let ProperAssessmentWorkflowCompletionListener = ProperAssessmentWorkflowCompletionListener_1 = class ProperAssessmentWorkflowCompletionListener {
    properSelfAssessmentService;
    logger = new common_1.Logger(ProperAssessmentWorkflowCompletionListener_1.name);
    constructor(properSelfAssessmentService) {
        this.properSelfAssessmentService = properSelfAssessmentService;
    }
    async onWorkflowInstanceCompleted(payload) {
        if (payload.entityType !== PROPER_ASSESSMENT_WORKFLOW_ENTITY_TYPE)
            return;
        await tenant_context_1.tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
            try {
                if (payload.status === "APPROVED") {
                    await this.properSelfAssessmentService.markInternalReviewApproved(payload.entityId);
                }
                else if (payload.status === "REJECTED") {
                    await this.properSelfAssessmentService.returnToDraft(payload.entityId);
                }
            }
            catch (err) {
                this.logger.error(`Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk proper_self_assessment=${payload.entityId}: ${err instanceof Error ? err.message : err}`);
            }
        });
    }
};
exports.ProperAssessmentWorkflowCompletionListener = ProperAssessmentWorkflowCompletionListener;
__decorate([
    (0, event_emitter_1.OnEvent)(workflow_engine_constants_1.WORKFLOW_INSTANCE_COMPLETED_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProperAssessmentWorkflowCompletionListener.prototype, "onWorkflowInstanceCompleted", null);
exports.ProperAssessmentWorkflowCompletionListener = ProperAssessmentWorkflowCompletionListener = ProperAssessmentWorkflowCompletionListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [proper_self_assessment_service_1.ProperSelfAssessmentService])
], ProperAssessmentWorkflowCompletionListener);
