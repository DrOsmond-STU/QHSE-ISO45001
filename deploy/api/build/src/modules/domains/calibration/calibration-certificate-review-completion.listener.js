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
var CalibrationCertificateReviewCompletionListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalibrationCertificateReviewCompletionListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const workflow_engine_constants_1 = require("../../../platform/workflow-engine/workflow-engine.constants");
const calibration_certificate_service_1 = require("./calibration-certificate.service");
/**
 * Task 6.2 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * calibration_certificate (§4.1 poin 6, 1-stage). Payload-only, pola PERSIS
 * listener modul lain sesi ini.
 */
let CalibrationCertificateReviewCompletionListener = CalibrationCertificateReviewCompletionListener_1 = class CalibrationCertificateReviewCompletionListener {
    certificateService;
    logger = new common_1.Logger(CalibrationCertificateReviewCompletionListener_1.name);
    constructor(certificateService) {
        this.certificateService = certificateService;
    }
    async onWorkflowInstanceCompleted(payload) {
        if (payload.entityType !== calibration_certificate_service_1.CERTIFICATE_WORKFLOW_ENTITY_TYPE)
            return;
        await tenant_context_1.tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
            try {
                await this.certificateService.onReviewCompleted(payload.entityId, payload.status === "APPROVED");
            }
            catch (err) {
                this.logger.error(`Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk calibration_certificate=${payload.entityId}: ${err instanceof Error ? err.message : err}`);
            }
        });
    }
};
exports.CalibrationCertificateReviewCompletionListener = CalibrationCertificateReviewCompletionListener;
__decorate([
    (0, event_emitter_1.OnEvent)(workflow_engine_constants_1.WORKFLOW_INSTANCE_COMPLETED_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CalibrationCertificateReviewCompletionListener.prototype, "onWorkflowInstanceCompleted", null);
exports.CalibrationCertificateReviewCompletionListener = CalibrationCertificateReviewCompletionListener = CalibrationCertificateReviewCompletionListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [calibration_certificate_service_1.CalibrationCertificateService])
], CalibrationCertificateReviewCompletionListener);
