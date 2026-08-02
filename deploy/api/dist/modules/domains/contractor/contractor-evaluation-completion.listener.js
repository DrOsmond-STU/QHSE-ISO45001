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
var ContractorEvaluationCompletionListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractorEvaluationCompletionListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const workflow_engine_constants_1 = require("../../../platform/workflow-engine/workflow-engine.constants");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const contractor_performance_evaluation_service_1 = require("./contractor-performance-evaluation.service");
let ContractorEvaluationCompletionListener = ContractorEvaluationCompletionListener_1 = class ContractorEvaluationCompletionListener {
    evaluationService;
    logger = new common_1.Logger(ContractorEvaluationCompletionListener_1.name);
    constructor(evaluationService) {
        this.evaluationService = evaluationService;
    }
    async onWorkflowInstanceCompleted(event) {
        if (event.entityType !== contractor_performance_evaluation_service_1.EVALUATION_WORKFLOW_ENTITY_TYPE)
            return;
        await tenant_context_1.tenantContextStorage.run({ tenantId: event.tenantId }, async () => {
            try {
                await this.evaluationService.onReviewCompleted(event.entityId, event.status === "APPROVED");
            }
            catch (err) {
                this.logger.error(`Gagal memproses penyelesaian workflow evaluation=${event.entityId}: ${err instanceof Error ? err.message : err}`);
            }
        });
    }
};
exports.ContractorEvaluationCompletionListener = ContractorEvaluationCompletionListener;
__decorate([
    (0, event_emitter_1.OnEvent)(workflow_engine_constants_1.WORKFLOW_INSTANCE_COMPLETED_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ContractorEvaluationCompletionListener.prototype, "onWorkflowInstanceCompleted", null);
exports.ContractorEvaluationCompletionListener = ContractorEvaluationCompletionListener = ContractorEvaluationCompletionListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [contractor_performance_evaluation_service_1.ContractorPerformanceEvaluationService])
], ContractorEvaluationCompletionListener);
//# sourceMappingURL=contractor-evaluation-completion.listener.js.map