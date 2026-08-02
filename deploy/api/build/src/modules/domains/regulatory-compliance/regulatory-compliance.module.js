"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegulatoryComplianceModule = void 0;
const common_1 = require("@nestjs/common");
const notification_module_1 = require("../../../platform/notification/notification.module");
const numbering_module_1 = require("../../../platform/numbering/numbering.module");
const observability_module_1 = require("../../../platform/observability/observability.module");
const tenancy_module_1 = require("../../../platform/tenancy/tenancy.module");
const workflow_engine_module_1 = require("../../../platform/workflow-engine/workflow-engine.module");
const organization_module_1 = require("../organization/organization.module");
const compliance_evaluation_service_1 = require("./compliance-evaluation.service");
const compliance_evaluation_workflow_completion_listener_1 = require("./compliance-evaluation-workflow-completion.listener");
const compliance_obligation_service_1 = require("./compliance-obligation.service");
const license_expiry_scan_queue_service_1 = require("./license-expiry-scan-queue.service");
const license_expiry_scan_service_1 = require("./license-expiry-scan.service");
const license_permit_service_1 = require("./license-permit.service");
const obligation_due_scan_queue_service_1 = require("./obligation-due-scan-queue.service");
const obligation_due_scan_service_1 = require("./obligation-due-scan.service");
const regulatory_compliance_bootstrap_service_1 = require("./regulatory-compliance-bootstrap.service");
const regulatory_register_controller_1 = require("./regulatory-register.controller");
const regulatory_register_service_1 = require("./regulatory-register.service");
// Task 2.2 (Modul 04) — modul DOMAIN KEENAM. BELUM ada controller HTTP
// (pola sama 1.1-1.6/2.1 modul tanpa deliverable apps/web) — compliance.*
// permission sudah di-seed RBAC baseline (task 92), siap digerbangi
// @RequirePermission begitu ada endpoint.
//
// WorkflowEngineModule diimpor utk WorkflowEngineService (submit approval
// evaluasi) — ComplianceEvaluationWorkflowCompletionListener mendengar
// WORKFLOW_INSTANCE_COMPLETED_EVENT (EventEmitter2 GLOBAL singleton, 0.8),
// pola PERSIS DocumentWorkflowCompletionListener (2.1).
// NumberingModule diimpor utk NumberingService (ComplianceEvaluationService.create,
// module_code=COMPLIANCE) — INGAT eksplisit ditambahkan (gap 2.1 task 86
// "DmsModule lupa NumberingModule" TIDAK diulang di sini).
// OrganizationModule diimpor utk IndustryTemplateService
// (RegulatoryRegisterService.seedFromIndustryTemplate()) — MODUL DOMAIN
// KEDUA yang mengimpor modul domain lain (pertama: SystemAdministrationModule,
// 1.5), orkestrasi lintas-modul genuinely butuh keduanya.
let RegulatoryComplianceModule = class RegulatoryComplianceModule {
};
exports.RegulatoryComplianceModule = RegulatoryComplianceModule;
exports.RegulatoryComplianceModule = RegulatoryComplianceModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule, observability_module_1.ObservabilityModule, workflow_engine_module_1.WorkflowEngineModule, numbering_module_1.NumberingModule, notification_module_1.NotificationModule, organization_module_1.OrganizationModule],
        controllers: [regulatory_register_controller_1.RegulatoryRegisterController],
        providers: [
            regulatory_compliance_bootstrap_service_1.RegulatoryComplianceBootstrapService,
            regulatory_register_service_1.RegulatoryRegisterService,
            compliance_obligation_service_1.ComplianceObligationService,
            compliance_evaluation_service_1.ComplianceEvaluationService,
            compliance_evaluation_workflow_completion_listener_1.ComplianceEvaluationWorkflowCompletionListener,
            license_permit_service_1.LicensePermitService,
            license_expiry_scan_queue_service_1.LicenseExpiryScanQueueService,
            license_expiry_scan_service_1.LicenseExpiryScanService,
            obligation_due_scan_queue_service_1.ObligationDueScanQueueService,
            obligation_due_scan_service_1.ObligationDueScanService,
        ],
        exports: [regulatory_register_service_1.RegulatoryRegisterService, compliance_obligation_service_1.ComplianceObligationService, compliance_evaluation_service_1.ComplianceEvaluationService, license_permit_service_1.LicensePermitService],
    })
], RegulatoryComplianceModule);
