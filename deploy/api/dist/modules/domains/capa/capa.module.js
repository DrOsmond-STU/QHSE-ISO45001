"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapaModule = void 0;
const common_1 = require("@nestjs/common");
const notification_module_1 = require("../../../platform/notification/notification.module");
const numbering_module_1 = require("../../../platform/numbering/numbering.module");
const observability_module_1 = require("../../../platform/observability/observability.module");
const tenancy_module_1 = require("../../../platform/tenancy/tenancy.module");
const workflow_engine_module_1 = require("../../../platform/workflow-engine/workflow-engine.module");
const audit_module_1 = require("../audit/audit.module");
const environmental_module_1 = require("../environmental/environmental.module");
const incident_module_1 = require("../incident/incident.module");
const audit_finding_capa_trigger_listener_1 = require("./audit-finding-capa-trigger.listener");
const environmental_monitoring_capa_trigger_listener_1 = require("./environmental-monitoring-capa-trigger.listener");
const capa_action_plan_service_1 = require("./capa-action-plan.service");
const capa_action_plan_workflow_completion_listener_1 = require("./capa-action-plan-workflow-completion.listener");
const capa_approval_cache_service_1 = require("./capa-approval-cache.service");
const capa_effectiveness_verification_due_scan_queue_service_1 = require("./capa-effectiveness-verification-due-scan-queue.service");
const capa_effectiveness_verification_due_scan_service_1 = require("./capa-effectiveness-verification-due-scan.service");
const capa_effectiveness_verification_service_1 = require("./capa-effectiveness-verification.service");
const capa_effectiveness_verification_workflow_completion_listener_1 = require("./capa-effectiveness-verification-workflow-completion.listener");
const capa_register_controller_1 = require("./capa-register.controller");
const capa_register_service_1 = require("./capa-register.service");
const capa_root_cause_analysis_service_1 = require("./capa-root-cause-analysis.service");
const capa_root_cause_sla_scan_queue_service_1 = require("./capa-root-cause-sla-scan-queue.service");
const capa_root_cause_sla_scan_service_1 = require("./capa-root-cause-sla-scan.service");
const capa_workflow_bootstrap_service_1 = require("./capa-workflow-bootstrap.service");
// Task 4.2 (Modul 10 CAPA Management), modul DOMAIN KETIGA BELAS, menutup
// Phase 4. PERTAMA di codebase yang jadi "hub" mengimpor modul domain
// sumber — AuditModule utk AuditFindingService, IncidentModule utk
// IncidentCorrectiveActionLinkService (orkestrasi genuinely dibutuhkan
// utk sync-back closure PRD §4 poin 10, lihat banner comment
// CapaEffectivenessVerificationWorkflowCompletionListener), DAN
// (task 5.2) EnvironmentalModule utk EnvironmentalMonitoringRecordService
// (BR-02 auto-trigger CAPA saat compliance_status=EXCEED, lihat
// EnvironmentalMonitoringCapaTriggerListener) — pola SAMA
// ProvisioningService/SystemAdministrationModule (1.5) yang PERTAMA kali
// mengimpor modul domain lain. InspectionModule DAN QualityModule TIDAK
// diimpor — linkage kedua modul itu ke CAPA murni MANUAL/OPSIONAL (PRD
// §7 Inspection, TASK_INSTRUCTION.md Quality), TIDAK butuh orkestrasi
// terbalik CAPA->modul itu. 2 job cron baru (capa-root-cause-sla-scan
// 05:45, capa-effectiveness-verification-due-scan 06:00) — konsumennya
// jalan di proses worker terpisah (lihat apps/worker/src/*.worker.ts +
// CapaWorkerModule) — TIDAK didaftarkan DI SINI.
let CapaModule = class CapaModule {
};
exports.CapaModule = CapaModule;
exports.CapaModule = CapaModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule, observability_module_1.ObservabilityModule, workflow_engine_module_1.WorkflowEngineModule, numbering_module_1.NumberingModule, notification_module_1.NotificationModule, audit_module_1.AuditModule, incident_module_1.IncidentModule, environmental_module_1.EnvironmentalModule],
        controllers: [capa_register_controller_1.CapaRegisterController],
        providers: [
            capa_workflow_bootstrap_service_1.CapaWorkflowBootstrapService,
            capa_register_service_1.CapaRegisterService,
            capa_root_cause_analysis_service_1.CapaRootCauseAnalysisService,
            capa_action_plan_service_1.CapaActionPlanService,
            capa_action_plan_workflow_completion_listener_1.CapaActionPlanWorkflowCompletionListener,
            capa_effectiveness_verification_service_1.CapaEffectivenessVerificationService,
            capa_effectiveness_verification_workflow_completion_listener_1.CapaEffectivenessVerificationWorkflowCompletionListener,
            capa_approval_cache_service_1.CapaApprovalCacheService,
            audit_finding_capa_trigger_listener_1.AuditFindingCapaTriggerListener,
            environmental_monitoring_capa_trigger_listener_1.EnvironmentalMonitoringCapaTriggerListener,
            capa_root_cause_sla_scan_queue_service_1.CapaRootCauseSlaScanQueueService,
            capa_root_cause_sla_scan_service_1.CapaRootCauseSlaScanService,
            capa_effectiveness_verification_due_scan_queue_service_1.CapaEffectivenessVerificationDueScanQueueService,
            capa_effectiveness_verification_due_scan_service_1.CapaEffectivenessVerificationDueScanService,
        ],
        exports: [capa_register_service_1.CapaRegisterService, capa_root_cause_analysis_service_1.CapaRootCauseAnalysisService, capa_action_plan_service_1.CapaActionPlanService, capa_effectiveness_verification_service_1.CapaEffectivenessVerificationService, capa_approval_cache_service_1.CapaApprovalCacheService],
    })
], CapaModule);
//# sourceMappingURL=capa.module.js.map