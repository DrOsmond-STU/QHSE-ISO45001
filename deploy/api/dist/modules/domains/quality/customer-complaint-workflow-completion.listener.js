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
var CustomerComplaintWorkflowCompletionListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerComplaintWorkflowCompletionListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const workflow_engine_constants_1 = require("../../../platform/workflow-engine/workflow-engine.constants");
const customer_complaint_service_1 = require("./customer-complaint.service");
const COMPLAINT_WORKFLOW_ENTITY_TYPE = "customer_complaint";
/**
 * Task 5.1 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * customer_complaint. APPROVED -> markInvestigationApproved() (severity
 * HIGH/CRITICAL tanpa capa_id -> CAPA_IN_PROGRESS, selainnya -> RESOLVED
 * langsung). REJECTED -> kembali UNDER_INVESTIGATION.
 */
let CustomerComplaintWorkflowCompletionListener = CustomerComplaintWorkflowCompletionListener_1 = class CustomerComplaintWorkflowCompletionListener {
    customerComplaintService;
    logger = new common_1.Logger(CustomerComplaintWorkflowCompletionListener_1.name);
    constructor(customerComplaintService) {
        this.customerComplaintService = customerComplaintService;
    }
    async onWorkflowInstanceCompleted(payload) {
        if (payload.entityType !== COMPLAINT_WORKFLOW_ENTITY_TYPE)
            return;
        await tenant_context_1.tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
            try {
                if (payload.status === "APPROVED") {
                    await this.customerComplaintService.markInvestigationApproved(payload.entityId);
                }
                else if (payload.status === "REJECTED") {
                    await this.customerComplaintService.returnToInvestigation(payload.entityId);
                }
            }
            catch (err) {
                this.logger.error(`Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk customer_complaint=${payload.entityId}: ${err instanceof Error ? err.message : err}`);
            }
        });
    }
};
exports.CustomerComplaintWorkflowCompletionListener = CustomerComplaintWorkflowCompletionListener;
__decorate([
    (0, event_emitter_1.OnEvent)(workflow_engine_constants_1.WORKFLOW_INSTANCE_COMPLETED_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CustomerComplaintWorkflowCompletionListener.prototype, "onWorkflowInstanceCompleted", null);
exports.CustomerComplaintWorkflowCompletionListener = CustomerComplaintWorkflowCompletionListener = CustomerComplaintWorkflowCompletionListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [customer_complaint_service_1.CustomerComplaintService])
], CustomerComplaintWorkflowCompletionListener);
//# sourceMappingURL=customer-complaint-workflow-completion.listener.js.map