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
var ContractorPrequalificationCompletionListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractorPrequalificationCompletionListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const workflow_engine_constants_1 = require("../../../platform/workflow-engine/workflow-engine.constants");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const contractor_prequalification_service_1 = require("./contractor-prequalification.service");
const contractor_service_1 = require("./contractor.service");
let ContractorPrequalificationCompletionListener = ContractorPrequalificationCompletionListener_1 = class ContractorPrequalificationCompletionListener {
    prequalificationService;
    contractorService;
    logger = new common_1.Logger(ContractorPrequalificationCompletionListener_1.name);
    constructor(prequalificationService, contractorService) {
        this.prequalificationService = prequalificationService;
        this.contractorService = contractorService;
    }
    async onWorkflowInstanceCompleted(event) {
        if (event.entityType !== contractor_prequalification_service_1.PREQUALIFICATION_WORKFLOW_ENTITY_TYPE)
            return;
        await tenant_context_1.tenantContextStorage.run({ tenantId: event.tenantId }, async () => {
            try {
                const approved = event.status === "APPROVED";
                const prequalification = await this.prequalificationService.onReviewCompleted(event.entityId, approved);
                // §4.1 poin 5 — "Hasil PASS/CONDITIONAL_PASS -> contractors.status =
                // PREQUALIFIED". FAIL TIDAK mengubah status kontraktor (BR-01 tetap
                // memblokir assignment lewat status existing kontraktor, TIDAK
                // butuh transisi eksplisit). ContractorService.updateStatus()
                // butuh actor context (requireActorUserId()) — TIDAK ADA actor
                // manusia di titik listener ini, jadi context di-run ULANG dgn
                // userId=evaluatedBy (evaluator asli), pola sama alasan `updatedBy`
                // di ContractorPrequalificationService.onReviewCompleted().
                if (approved && (prequalification.result === "PASS" || prequalification.result === "CONDITIONAL_PASS")) {
                    const systemActorUserId = prequalification.evaluatedBy ?? prequalification.createdBy;
                    await tenant_context_1.tenantContextStorage.run({ tenantId: event.tenantId, userId: systemActorUserId }, () => this.contractorService.updateStatus(prequalification.contractorId, "PREQUALIFIED"));
                }
            }
            catch (err) {
                this.logger.error(`Gagal memproses penyelesaian workflow prequalification=${event.entityId}: ${err instanceof Error ? err.message : err}`);
            }
        });
    }
};
exports.ContractorPrequalificationCompletionListener = ContractorPrequalificationCompletionListener;
__decorate([
    (0, event_emitter_1.OnEvent)(workflow_engine_constants_1.WORKFLOW_INSTANCE_COMPLETED_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ContractorPrequalificationCompletionListener.prototype, "onWorkflowInstanceCompleted", null);
exports.ContractorPrequalificationCompletionListener = ContractorPrequalificationCompletionListener = ContractorPrequalificationCompletionListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [contractor_prequalification_service_1.ContractorPrequalificationService,
        contractor_service_1.ContractorService])
], ContractorPrequalificationCompletionListener);
//# sourceMappingURL=contractor-prequalification-completion.listener.js.map