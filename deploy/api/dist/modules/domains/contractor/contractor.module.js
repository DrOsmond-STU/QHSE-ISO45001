"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractorModule = void 0;
const common_1 = require("@nestjs/common");
const audit_log_module_1 = require("../../../platform/audit-log/audit-log.module");
const notification_module_1 = require("../../../platform/notification/notification.module");
const numbering_module_1 = require("../../../platform/numbering/numbering.module");
const observability_module_1 = require("../../../platform/observability/observability.module");
const tenancy_module_1 = require("../../../platform/tenancy/tenancy.module");
const workflow_engine_module_1 = require("../../../platform/workflow-engine/workflow-engine.module");
const contractor_document_compliance_service_1 = require("./contractor-document-compliance.service");
const contractor_due_scan_queue_service_1 = require("./contractor-due-scan-queue.service");
const contractor_due_scan_service_1 = require("./contractor-due-scan.service");
const contractor_evaluation_completion_listener_1 = require("./contractor-evaluation-completion.listener");
const contractor_performance_evaluation_service_1 = require("./contractor-performance-evaluation.service");
const contractor_prequalification_completion_listener_1 = require("./contractor-prequalification-completion.listener");
const contractor_prequalification_service_1 = require("./contractor-prequalification.service");
const contractor_project_assignment_service_1 = require("./contractor-project-assignment.service");
const contractor_worker_service_1 = require("./contractor-worker.service");
const contractor_workflow_bootstrap_service_1 = require("./contractor-workflow-bootstrap.service");
const contractor_controller_1 = require("./contractor.controller");
const contractor_service_1 = require("./contractor.service");
// Task 6.3 (Modul 17 Contractor Management), modul DOMAIN KEDUA PULUH SATU.
// TIDAK mengimpor modul domain lain (arah dependency SEARAH — Work Permit
// 3.3/3.4 & Incident 3.5 merujuk BALIK ke modul ini via FK retroaktif
// contractorCompanyId, lihat banner comment schema.prisma blok Modul 17;
// KEBALIKANNYA, modul ini query LANGSUNG incident_reports via Prisma shared
// schema utk BR agregat evaluasi §4.4 poin 1, pola sama CapaRegisterService
// assertSourceValidIfKnownContract — bukan impor IncidentModule).
let ContractorModule = class ContractorModule {
};
exports.ContractorModule = ContractorModule;
exports.ContractorModule = ContractorModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule, observability_module_1.ObservabilityModule, workflow_engine_module_1.WorkflowEngineModule, numbering_module_1.NumberingModule, notification_module_1.NotificationModule, audit_log_module_1.AuditLogModule],
        controllers: [contractor_controller_1.ContractorController],
        providers: [
            contractor_workflow_bootstrap_service_1.ContractorWorkflowBootstrapService,
            contractor_service_1.ContractorService,
            contractor_prequalification_service_1.ContractorPrequalificationService,
            contractor_prequalification_completion_listener_1.ContractorPrequalificationCompletionListener,
            contractor_document_compliance_service_1.ContractorDocumentComplianceService,
            contractor_worker_service_1.ContractorWorkerService,
            contractor_project_assignment_service_1.ContractorProjectAssignmentService,
            contractor_performance_evaluation_service_1.ContractorPerformanceEvaluationService,
            contractor_evaluation_completion_listener_1.ContractorEvaluationCompletionListener,
            // Job cron contractor-due-scan (07:15, PRD §8 baris 1/2/3) — KEDUA
            // *QueueService (producer) DAN *ScanService (consumer) didaftarkan DI
            // SINI SEKALIGUS di ContractorWorkerModule (apps/worker), pola PERSIS
            // Calibration 6.2 (createTestApp() tidak pernah boot modul worker
            // terpisah, test app.get(ScanService) butuh provider itu ada di modul
            // API juga).
            contractor_due_scan_queue_service_1.ContractorDueScanQueueService,
            contractor_due_scan_service_1.ContractorDueScanService,
        ],
        exports: [
            contractor_service_1.ContractorService,
            contractor_prequalification_service_1.ContractorPrequalificationService,
            contractor_document_compliance_service_1.ContractorDocumentComplianceService,
            contractor_worker_service_1.ContractorWorkerService,
            contractor_project_assignment_service_1.ContractorProjectAssignmentService,
            contractor_performance_evaluation_service_1.ContractorPerformanceEvaluationService,
        ],
    })
], ContractorModule);
//# sourceMappingURL=contractor.module.js.map