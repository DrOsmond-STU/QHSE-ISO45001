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
var OccupationalDiseaseCaseWorkflowCompletionListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OccupationalDiseaseCaseWorkflowCompletionListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const workflow_engine_constants_1 = require("../../../platform/workflow-engine/workflow-engine.constants");
const occupational_disease_case_service_1 = require("./occupational-disease-case.service");
const PAK_CASE_WORKFLOW_ENTITY_TYPE = "occupational_disease_case";
/**
 * Task 5.3 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * occupational_disease_case (workflow OH_PAK_CASE 2-stage: konfirmasi
 * diagnosis Physician + review sistemik HSE Manager). Payload-only, pola
 * PERSIS EnvironmentalAspectReviewWorkflowCompletionListener 5.2 —
 * APPROVED/REJECTED SAMA-SAMA hanya clear workflowInstanceId
 * (markReviewCompleted(), lihat banner comment kelas itu soal alasan
 * case_status TIDAK ikut berubah di sini).
 */
let OccupationalDiseaseCaseWorkflowCompletionListener = OccupationalDiseaseCaseWorkflowCompletionListener_1 = class OccupationalDiseaseCaseWorkflowCompletionListener {
    pakCaseService;
    logger = new common_1.Logger(OccupationalDiseaseCaseWorkflowCompletionListener_1.name);
    constructor(pakCaseService) {
        this.pakCaseService = pakCaseService;
    }
    async onWorkflowInstanceCompleted(payload) {
        if (payload.entityType !== PAK_CASE_WORKFLOW_ENTITY_TYPE)
            return;
        await tenant_context_1.tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
            try {
                if (payload.status === "APPROVED" || payload.status === "REJECTED") {
                    await this.pakCaseService.markReviewCompleted(payload.entityId);
                }
            }
            catch (err) {
                this.logger.error(`Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk occupational_disease_case=${payload.entityId}: ${err instanceof Error ? err.message : err}`);
            }
        });
    }
};
exports.OccupationalDiseaseCaseWorkflowCompletionListener = OccupationalDiseaseCaseWorkflowCompletionListener;
__decorate([
    (0, event_emitter_1.OnEvent)(workflow_engine_constants_1.WORKFLOW_INSTANCE_COMPLETED_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OccupationalDiseaseCaseWorkflowCompletionListener.prototype, "onWorkflowInstanceCompleted", null);
exports.OccupationalDiseaseCaseWorkflowCompletionListener = OccupationalDiseaseCaseWorkflowCompletionListener = OccupationalDiseaseCaseWorkflowCompletionListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [occupational_disease_case_service_1.OccupationalDiseaseCaseService])
], OccupationalDiseaseCaseWorkflowCompletionListener);
