import { Module } from "@nestjs/common";
import { NotificationModule } from "../../../platform/notification/notification.module";
import { NumberingModule } from "../../../platform/numbering/numbering.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { WorkflowEngineModule } from "../../../platform/workflow-engine/workflow-engine.module";
import { OrganizationModule } from "../organization/organization.module";
import { ComplianceEvaluationService } from "./compliance-evaluation.service";
import { ComplianceEvaluationWorkflowCompletionListener } from "./compliance-evaluation-workflow-completion.listener";
import { ComplianceObligationService } from "./compliance-obligation.service";
import { LicenseExpiryScanQueueService } from "./license-expiry-scan-queue.service";
import { LicenseExpiryScanService } from "./license-expiry-scan.service";
import { LicensePermitService } from "./license-permit.service";
import { ObligationDueScanQueueService } from "./obligation-due-scan-queue.service";
import { ObligationDueScanService } from "./obligation-due-scan.service";
import { RegulatoryComplianceBootstrapService } from "./regulatory-compliance-bootstrap.service";
import { RegulatoryRegisterService } from "./regulatory-register.service";

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
@Module({
  imports: [TenancyModule, ObservabilityModule, WorkflowEngineModule, NumberingModule, NotificationModule, OrganizationModule],
  providers: [
    RegulatoryComplianceBootstrapService,
    RegulatoryRegisterService,
    ComplianceObligationService,
    ComplianceEvaluationService,
    ComplianceEvaluationWorkflowCompletionListener,
    LicensePermitService,
    LicenseExpiryScanQueueService,
    LicenseExpiryScanService,
    ObligationDueScanQueueService,
    ObligationDueScanService,
  ],
  exports: [RegulatoryRegisterService, ComplianceObligationService, ComplianceEvaluationService, LicensePermitService],
})
export class RegulatoryComplianceModule {}
