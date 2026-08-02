"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditModule = void 0;
const common_1 = require("@nestjs/common");
const notification_module_1 = require("../../../platform/notification/notification.module");
const numbering_module_1 = require("../../../platform/numbering/numbering.module");
const observability_module_1 = require("../../../platform/observability/observability.module");
const tenancy_module_1 = require("../../../platform/tenancy/tenancy.module");
const workflow_engine_module_1 = require("../../../platform/workflow-engine/workflow-engine.module");
const audit_auditee_scope_service_1 = require("./audit-auditee-scope.service");
const audit_checklist_service_1 = require("./audit-checklist.service");
const audit_finding_closure_due_scan_queue_service_1 = require("./audit-finding-closure-due-scan-queue.service");
const audit_finding_closure_due_scan_service_1 = require("./audit-finding-closure-due-scan.service");
const audit_finding_service_1 = require("./audit-finding.service");
const audit_program_service_1 = require("./audit-program.service");
const audit_program_workflow_completion_listener_1 = require("./audit-program-workflow-completion.listener");
const audit_report_service_1 = require("./audit-report.service");
const audit_report_workflow_completion_listener_1 = require("./audit-report-workflow-completion.listener");
const audit_team_member_service_1 = require("./audit-team-member.service");
const audit_type_service_1 = require("./audit-type.service");
const audit_workflow_bootstrap_service_1 = require("./audit-workflow-bootstrap.service");
const audit_controller_1 = require("./audit.controller");
const audit_service_1 = require("./audit.service");
const auditor_competency_expiry_scan_queue_service_1 = require("./auditor-competency-expiry-scan-queue.service");
const auditor_competency_expiry_scan_service_1 = require("./auditor-competency-expiry-scan.service");
const auditor_competency_record_service_1 = require("./auditor-competency-record.service");
// Task 4.1 (Modul 09 Audit Management) — modul DOMAIN KEDUA BELAS.
// Mereferensikan documents (Modul 03) via FK Prisma LANGSUNG (TIDAK
// mengimpor DmsModule). PERTAMA KALI satu modul domain butuh DUA
// workflow_definitions process sekaligus (audit_program, audit_report —
// lihat banner comment schema.prisma). 2 job cron baru
// (auditor-competency-expiry-scan 05:15, audit-finding-closure-due-scan
// 05:30) — konsumennya jalan di proses worker terpisah (lihat
// apps/worker/src/*.worker.ts + AuditWorkerModule) — TIDAK didaftarkan DI SINI.
let AuditModule = class AuditModule {
};
exports.AuditModule = AuditModule;
exports.AuditModule = AuditModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule, observability_module_1.ObservabilityModule, workflow_engine_module_1.WorkflowEngineModule, numbering_module_1.NumberingModule, notification_module_1.NotificationModule],
        controllers: [audit_controller_1.AuditController],
        providers: [
            audit_workflow_bootstrap_service_1.AuditWorkflowBootstrapService,
            audit_type_service_1.AuditTypeService,
            audit_checklist_service_1.AuditChecklistService,
            audit_program_service_1.AuditProgramService,
            audit_program_workflow_completion_listener_1.AuditProgramWorkflowCompletionListener,
            audit_service_1.AuditService,
            audit_team_member_service_1.AuditTeamMemberService,
            audit_auditee_scope_service_1.AuditAuditeeScopeService,
            audit_finding_service_1.AuditFindingService,
            auditor_competency_record_service_1.AuditorCompetencyRecordService,
            audit_report_service_1.AuditReportService,
            audit_report_workflow_completion_listener_1.AuditReportWorkflowCompletionListener,
            auditor_competency_expiry_scan_queue_service_1.AuditorCompetencyExpiryScanQueueService,
            auditor_competency_expiry_scan_service_1.AuditorCompetencyExpiryScanService,
            audit_finding_closure_due_scan_queue_service_1.AuditFindingClosureDueScanQueueService,
            audit_finding_closure_due_scan_service_1.AuditFindingClosureDueScanService,
        ],
        exports: [
            audit_type_service_1.AuditTypeService,
            audit_checklist_service_1.AuditChecklistService,
            audit_program_service_1.AuditProgramService,
            audit_service_1.AuditService,
            audit_team_member_service_1.AuditTeamMemberService,
            audit_auditee_scope_service_1.AuditAuditeeScopeService,
            audit_finding_service_1.AuditFindingService,
            auditor_competency_record_service_1.AuditorCompetencyRecordService,
            audit_report_service_1.AuditReportService,
        ],
    })
], AuditModule);
