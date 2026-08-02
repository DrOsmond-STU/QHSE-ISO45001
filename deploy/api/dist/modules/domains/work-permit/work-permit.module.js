"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkPermitModule = void 0;
const common_1 = require("@nestjs/common");
const contractor_module_1 = require("../contractor/contractor.module");
const notification_module_1 = require("../../../platform/notification/notification.module");
const numbering_module_1 = require("../../../platform/numbering/numbering.module");
const observability_module_1 = require("../../../platform/observability/observability.module");
const tenancy_module_1 = require("../../../platform/tenancy/tenancy.module");
const workflow_engine_module_1 = require("../../../platform/workflow-engine/workflow-engine.module");
const gas_retest_due_scan_queue_service_1 = require("./gas-retest-due-scan-queue.service");
const gas_retest_due_scan_service_1 = require("./gas-retest-due-scan.service");
const gas_test_result_service_1 = require("./gas-test-result.service");
const isolation_loto_record_service_1 = require("./isolation-loto-record.service");
const work_permit_approval_cache_service_1 = require("./work-permit-approval-cache.service");
const work_permit_closure_service_1 = require("./work-permit-closure.service");
const work_permit_expiry_scan_queue_service_1 = require("./work-permit-expiry-scan-queue.service");
const work_permit_expiry_scan_service_1 = require("./work-permit-expiry-scan.service");
const work_permit_extension_workflow_completion_listener_1 = require("./work-permit-extension-workflow-completion.listener");
const work_permit_extension_service_1 = require("./work-permit-extension.service");
const work_permit_type_service_1 = require("./work-permit-type.service");
const work_permit_workflow_bootstrap_service_1 = require("./work-permit-workflow-bootstrap.service");
const work_permit_workflow_completion_listener_1 = require("./work-permit-workflow-completion.listener");
const work_permit_controller_1 = require("./work-permit.controller");
const work_permit_service_1 = require("./work-permit.service");
// Task 3.3 (tipe & alur inti) — modul DOMAIN KEDELAPAN, awal cakupan
// Modul 06 (BEDA dari risk-management/* — modul domain TERPISAH, bukan
// submodul saudara). Task 3.4 (extension, closure & cross-link)
// MELENGKAPI cakupan Modul 06 sisa — work_permit_extensions/
// work_permit_closures + 2 job cron baru (work-permit-expiry-scan
// BR-07/E2E-1, gas-retest-due-scan BR-05) — konsumennya jalan di proses
// worker terpisah (lihat apps/worker/src/*.worker.ts + WorkPermitWorkerModule)
// — TIDAK didaftarkan DI SINI, pola sama seluruh job lain codebase ini.
// Task 6.3 — mengimpor ContractorModule (Modul 17, LEBIH BARU) utk BR-02
// (blokir permit requester contractorCompanyId saat dokumen kepatuhan
// EXPIRED) — arah dependency TERBALIK dari kebiasaan "modul lama tidak
// impor modul baru" (preseden SAMA kelas gap OH BR-07 5.3, TAPI di sini
// WAJIB diselesaikan krn TASK_INSTRUCTION.md 6.3 eksplisit minta
// "hubungkan referensi yang di-stub sebelumnya", bukan didiamkan).
let WorkPermitModule = class WorkPermitModule {
};
exports.WorkPermitModule = WorkPermitModule;
exports.WorkPermitModule = WorkPermitModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule, observability_module_1.ObservabilityModule, workflow_engine_module_1.WorkflowEngineModule, numbering_module_1.NumberingModule, notification_module_1.NotificationModule, contractor_module_1.ContractorModule],
        controllers: [work_permit_controller_1.WorkPermitController],
        providers: [
            work_permit_workflow_bootstrap_service_1.WorkPermitWorkflowBootstrapService,
            work_permit_approval_cache_service_1.WorkPermitApprovalCacheService,
            work_permit_type_service_1.WorkPermitTypeService,
            work_permit_service_1.WorkPermitService,
            work_permit_workflow_completion_listener_1.WorkPermitWorkflowCompletionListener,
            gas_test_result_service_1.GasTestResultService,
            isolation_loto_record_service_1.IsolationLotoRecordService,
            work_permit_extension_service_1.WorkPermitExtensionService,
            work_permit_extension_workflow_completion_listener_1.WorkPermitExtensionWorkflowCompletionListener,
            work_permit_closure_service_1.WorkPermitClosureService,
            work_permit_expiry_scan_queue_service_1.WorkPermitExpiryScanQueueService,
            work_permit_expiry_scan_service_1.WorkPermitExpiryScanService,
            gas_retest_due_scan_queue_service_1.GasRetestDueScanQueueService,
            gas_retest_due_scan_service_1.GasRetestDueScanService,
        ],
        exports: [
            work_permit_type_service_1.WorkPermitTypeService,
            work_permit_service_1.WorkPermitService,
            gas_test_result_service_1.GasTestResultService,
            isolation_loto_record_service_1.IsolationLotoRecordService,
            work_permit_extension_service_1.WorkPermitExtensionService,
            work_permit_closure_service_1.WorkPermitClosureService,
        ],
    })
], WorkPermitModule);
//# sourceMappingURL=work-permit.module.js.map