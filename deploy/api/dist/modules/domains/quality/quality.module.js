"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QualityModule = void 0;
const common_1 = require("@nestjs/common");
const notification_module_1 = require("../../../platform/notification/notification.module");
const numbering_module_1 = require("../../../platform/numbering/numbering.module");
const observability_module_1 = require("../../../platform/observability/observability.module");
const tenancy_module_1 = require("../../../platform/tenancy/tenancy.module");
const workflow_engine_module_1 = require("../../../platform/workflow-engine/workflow-engine.module");
const customer_complaint_service_1 = require("./customer-complaint.service");
const customer_complaint_workflow_completion_listener_1 = require("./customer-complaint-workflow-completion.listener");
const ncr_record_controller_1 = require("./ncr-record.controller");
const ncr_record_service_1 = require("./ncr-record.service");
const ncr_workflow_completion_listener_1 = require("./ncr-workflow-completion.listener");
const quality_complaint_response_sla_scan_queue_service_1 = require("./quality-complaint-response-sla-scan-queue.service");
const quality_complaint_response_sla_scan_service_1 = require("./quality-complaint-response-sla-scan.service");
const quality_inspection_service_1 = require("./quality-inspection.service");
const quality_objective_service_1 = require("./quality-objective.service");
const quality_workflow_bootstrap_service_1 = require("./quality-workflow-bootstrap.service");
const supplier_eval_workflow_completion_listener_1 = require("./supplier-eval-workflow-completion.listener");
const supplier_quality_record_service_1 = require("./supplier-quality-record.service");
// Task 5.1 (Modul 11 Quality Management), modul DOMAIN KELIMA BELAS, awal
// Phase 5. PERTAMA modul domain dgn EMPAT workflow_definitions process
// sekaligus (QUALITY_NCR 3-stage, QUALITY_COMPLAINT 3-stage,
// QUALITY_INSPECTION_DEVIATION 1-stage, QUALITY_SUPPLIER_EVAL 1-stage —
// lihat banner comment QualityWorkflowBootstrapService). TIDAK mengimpor
// CapaModule — BEDA dari Audit 4.1 (auto-trigger CAPA), CAPA-linkage
// modul ini SELURUHNYA MANUAL (linkCapaRegister() terima capaRegisterId
// caller-supplied, pola sama Incident 3.5), lihat banner comment
// NcrRecordService soal alasan TASK_INSTRUCTION.md acceptance 5.1 "NCR
// DAPAT memicu CAPA" dibaca lebih lunak dari Modul 09's "OTOMATIS".
// CapaRegisterService.assertSourceValidIfKnownContract() (task 4.2)
// diperluas TERPISAH (capa-register.service.ts, BR-05) utk memvalidasi
// source_type=QUALITY_NCR/CUSTOMER_COMPLAINT via FK Prisma LANGSUNG ke
// ncr_records/customer_complaints — TIDAK butuh impor modul ini balik ke
// CapaModule (arah dependency SEARAH: CAPA tahu soal Quality via query
// tabel langsung, Quality tidak perlu tahu soal CAPA sama sekali). SATU
// job cron baru (quality-complaint-response-sla-scan 06:15 BR-02) —
// konsumennya jalan di proses worker terpisah (lihat
// apps/worker/src/*.worker.ts + QualityWorkerModule) — TIDAK didaftarkan
// DI SINI.
let QualityModule = class QualityModule {
};
exports.QualityModule = QualityModule;
exports.QualityModule = QualityModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule, observability_module_1.ObservabilityModule, workflow_engine_module_1.WorkflowEngineModule, numbering_module_1.NumberingModule, notification_module_1.NotificationModule],
        controllers: [ncr_record_controller_1.NcrRecordController],
        providers: [
            quality_workflow_bootstrap_service_1.QualityWorkflowBootstrapService,
            ncr_record_service_1.NcrRecordService,
            ncr_workflow_completion_listener_1.NcrWorkflowCompletionListener,
            customer_complaint_service_1.CustomerComplaintService,
            customer_complaint_workflow_completion_listener_1.CustomerComplaintWorkflowCompletionListener,
            quality_inspection_service_1.QualityInspectionService,
            supplier_quality_record_service_1.SupplierQualityRecordService,
            supplier_eval_workflow_completion_listener_1.SupplierEvalWorkflowCompletionListener,
            quality_objective_service_1.QualityObjectiveService,
            quality_complaint_response_sla_scan_queue_service_1.QualityComplaintResponseSlaScanQueueService,
            quality_complaint_response_sla_scan_service_1.QualityComplaintResponseSlaScanService,
        ],
        exports: [ncr_record_service_1.NcrRecordService, customer_complaint_service_1.CustomerComplaintService, quality_inspection_service_1.QualityInspectionService, supplier_quality_record_service_1.SupplierQualityRecordService, quality_objective_service_1.QualityObjectiveService],
    })
], QualityModule);
//# sourceMappingURL=quality.module.js.map