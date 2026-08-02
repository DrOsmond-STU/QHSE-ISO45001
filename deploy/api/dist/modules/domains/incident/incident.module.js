"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentModule = void 0;
const common_1 = require("@nestjs/common");
const notification_module_1 = require("../../../platform/notification/notification.module");
const numbering_module_1 = require("../../../platform/numbering/numbering.module");
const observability_module_1 = require("../../../platform/observability/observability.module");
const tenancy_module_1 = require("../../../platform/tenancy/tenancy.module");
const workflow_engine_module_1 = require("../../../platform/workflow-engine/workflow-engine.module");
const incident_corrective_action_link_service_1 = require("./incident-corrective-action-link.service");
const incident_investigation_service_1 = require("./incident-investigation.service");
const incident_regulatory_report_overdue_scan_queue_service_1 = require("./incident-regulatory-report-overdue-scan-queue.service");
const incident_regulatory_report_overdue_scan_service_1 = require("./incident-regulatory-report-overdue-scan.service");
const incident_regulatory_report_service_1 = require("./incident-regulatory-report.service");
const incident_statistics_cache_service_1 = require("./incident-statistics-cache.service");
const incident_statistics_recalc_scan_queue_service_1 = require("./incident-statistics-recalc-scan-queue.service");
const incident_statistics_recalc_scan_service_1 = require("./incident-statistics-recalc-scan.service");
const incident_witness_statement_service_1 = require("./incident-witness-statement.service");
const incident_workflow_bootstrap_service_1 = require("./incident-workflow-bootstrap.service");
const incident_workflow_completion_listener_1 = require("./incident-workflow-completion.listener");
const incident_report_controller_1 = require("./incident-report.controller");
const incident_report_service_1 = require("./incident-report.service");
// Task 3.5 (Modul 07 Incident Management) — modul DOMAIN KESEMBILAN, hanya
// mereferensikan work_permits (Modul 06) via FK Prisma langsung, TIDAK
// mengimpor WorkPermitModule. 2 job cron baru (incident-regulatory-report-
// overdue-scan BR-09, incident-statistics-recalc-scan BR-06) — konsumennya
// jalan di proses worker terpisah (lihat apps/worker/src/*.worker.ts +
// IncidentWorkerModule) — TIDAK didaftarkan DI SINI, pola sama seluruh job
// lain codebase ini.
let IncidentModule = class IncidentModule {
};
exports.IncidentModule = IncidentModule;
exports.IncidentModule = IncidentModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule, observability_module_1.ObservabilityModule, workflow_engine_module_1.WorkflowEngineModule, numbering_module_1.NumberingModule, notification_module_1.NotificationModule],
        controllers: [incident_report_controller_1.IncidentReportController],
        providers: [
            incident_workflow_bootstrap_service_1.IncidentWorkflowBootstrapService,
            incident_report_service_1.IncidentReportService,
            incident_investigation_service_1.IncidentInvestigationService,
            incident_workflow_completion_listener_1.IncidentWorkflowCompletionListener,
            incident_corrective_action_link_service_1.IncidentCorrectiveActionLinkService,
            incident_witness_statement_service_1.IncidentWitnessStatementService,
            incident_regulatory_report_service_1.IncidentRegulatoryReportService,
            incident_regulatory_report_overdue_scan_queue_service_1.IncidentRegulatoryReportOverdueScanQueueService,
            incident_regulatory_report_overdue_scan_service_1.IncidentRegulatoryReportOverdueScanService,
            incident_statistics_cache_service_1.IncidentStatisticsCacheService,
            incident_statistics_recalc_scan_queue_service_1.IncidentStatisticsRecalcScanQueueService,
            incident_statistics_recalc_scan_service_1.IncidentStatisticsRecalcScanService,
        ],
        exports: [
            incident_report_service_1.IncidentReportService,
            incident_investigation_service_1.IncidentInvestigationService,
            incident_corrective_action_link_service_1.IncidentCorrectiveActionLinkService,
            incident_witness_statement_service_1.IncidentWitnessStatementService,
            incident_regulatory_report_service_1.IncidentRegulatoryReportService,
            incident_statistics_cache_service_1.IncidentStatisticsCacheService,
        ],
    })
], IncidentModule);
//# sourceMappingURL=incident.module.js.map