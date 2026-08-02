"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HiraJsaHiradcModule = void 0;
const common_1 = require("@nestjs/common");
const notification_module_1 = require("../../../../platform/notification/notification.module");
const numbering_module_1 = require("../../../../platform/numbering/numbering.module");
const observability_module_1 = require("../../../../platform/observability/observability.module");
const tenancy_module_1 = require("../../../../platform/tenancy/tenancy.module");
const workflow_engine_module_1 = require("../../../../platform/workflow-engine/workflow-engine.module");
const hira_assessment_controller_1 = require("./hira-assessment.controller");
const hira_assessment_service_1 = require("./hira-assessment.service");
const hira_review_due_scan_queue_service_1 = require("./hira-review-due-scan-queue.service");
const hira_review_due_scan_service_1 = require("./hira-review-due-scan.service");
const hira_workflow_completion_listener_1 = require("./hira-workflow-completion.listener");
const hiradc_expiry_scan_queue_service_1 = require("./hiradc-expiry-scan-queue.service");
const hiradc_expiry_scan_service_1 = require("./hiradc-expiry-scan.service");
const hiradc_record_service_1 = require("./hiradc-record.service");
const hiradc_workflow_completion_listener_1 = require("./hiradc-workflow-completion.listener");
const jsa_record_service_1 = require("./jsa-record.service");
const jsa_workflow_completion_listener_1 = require("./jsa-workflow-completion.listener");
const risk_register_review_scan_queue_service_1 = require("./risk-register-review-scan-queue.service");
const risk_register_review_scan_service_1 = require("./risk-register-review-scan.service");
const risk_register_service_1 = require("./risk-register.service");
const risk_treatment_plan_service_1 = require("./risk-treatment-plan.service");
const risk_workflow_bootstrap_service_1 = require("./risk-workflow-bootstrap.service");
// Task 3.2 (Modul 05 sisa) — submodul SAUDARA RiskMatrixModule (task 3.1)
// di bawah domain risk-management/ yang SAMA (BUKAN modul domain baru
// terpisah — Modul 05 PRD yang sama, sengaja dipecah 2 task/2 file modul
// krn cakupannya besar). TIDAK impor RiskMatrixModule — akses lintas
// submodul (HazardRegisterService.retire() baca hira_hazard_lines/dst,
// service di sini baca risk_matrix_cells) SELALU lewat query Prisma
// LANGSUNG (pola sama lintas-modul-domain lain codebase ini, mis.
// EntitlementCheckService), BUKAN inject service submodul lain — nol
// coupling NestJS DI antara risk-management/matrix dan
// risk-management/hira-jsa-hiradc.
//
// NumberingModule DIINGAT eksplisit (gap 2.1 task 86 TIDAK diulang lagi —
// task 2.2 juga sudah menghindarinya, sekarang task ketiga berturut-turut
// yang eksplisit mengecek ini SEBELUM test pertama jalan).
let HiraJsaHiradcModule = class HiraJsaHiradcModule {
};
exports.HiraJsaHiradcModule = HiraJsaHiradcModule;
exports.HiraJsaHiradcModule = HiraJsaHiradcModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule, observability_module_1.ObservabilityModule, workflow_engine_module_1.WorkflowEngineModule, numbering_module_1.NumberingModule, notification_module_1.NotificationModule],
        controllers: [hira_assessment_controller_1.HiraAssessmentController],
        providers: [
            risk_workflow_bootstrap_service_1.RiskWorkflowBootstrapService,
            hira_assessment_service_1.HiraAssessmentService,
            hira_workflow_completion_listener_1.HiraWorkflowCompletionListener,
            jsa_record_service_1.JsaRecordService,
            jsa_workflow_completion_listener_1.JsaWorkflowCompletionListener,
            hiradc_record_service_1.HiradcRecordService,
            hiradc_workflow_completion_listener_1.HiradcWorkflowCompletionListener,
            risk_register_service_1.RiskRegisterService,
            risk_treatment_plan_service_1.RiskTreatmentPlanService,
            hiradc_expiry_scan_queue_service_1.HiradcExpiryScanQueueService,
            hiradc_expiry_scan_service_1.HiradcExpiryScanService,
            risk_register_review_scan_queue_service_1.RiskRegisterReviewScanQueueService,
            risk_register_review_scan_service_1.RiskRegisterReviewScanService,
            hira_review_due_scan_queue_service_1.HiraReviewDueScanQueueService,
            hira_review_due_scan_service_1.HiraReviewDueScanService,
        ],
        exports: [hira_assessment_service_1.HiraAssessmentService, jsa_record_service_1.JsaRecordService, hiradc_record_service_1.HiradcRecordService, risk_register_service_1.RiskRegisterService, risk_treatment_plan_service_1.RiskTreatmentPlanService],
    })
], HiraJsaHiradcModule);
