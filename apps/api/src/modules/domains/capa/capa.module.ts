import { Module } from "@nestjs/common";
import { NotificationModule } from "../../../platform/notification/notification.module";
import { NumberingModule } from "../../../platform/numbering/numbering.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { WorkflowEngineModule } from "../../../platform/workflow-engine/workflow-engine.module";
import { AuditModule } from "../audit/audit.module";
import { EnvironmentalModule } from "../environmental/environmental.module";
import { IncidentModule } from "../incident/incident.module";
import { AuditFindingCapaTriggerListener } from "./audit-finding-capa-trigger.listener";
import { EnvironmentalMonitoringCapaTriggerListener } from "./environmental-monitoring-capa-trigger.listener";
import { CapaActionPlanService } from "./capa-action-plan.service";
import { CapaActionPlanWorkflowCompletionListener } from "./capa-action-plan-workflow-completion.listener";
import { CapaApprovalCacheService } from "./capa-approval-cache.service";
import { CapaEffectivenessVerificationDueScanQueueService } from "./capa-effectiveness-verification-due-scan-queue.service";
import { CapaEffectivenessVerificationDueScanService } from "./capa-effectiveness-verification-due-scan.service";
import { CapaEffectivenessVerificationService } from "./capa-effectiveness-verification.service";
import { CapaEffectivenessVerificationWorkflowCompletionListener } from "./capa-effectiveness-verification-workflow-completion.listener";
import { CapaRegisterController } from "./capa-register.controller";
import { CapaRegisterService } from "./capa-register.service";
import { CapaRootCauseAnalysisService } from "./capa-root-cause-analysis.service";
import { CapaRootCauseSlaScanQueueService } from "./capa-root-cause-sla-scan-queue.service";
import { CapaRootCauseSlaScanService } from "./capa-root-cause-sla-scan.service";
import { CapaWorkflowBootstrapService } from "./capa-workflow-bootstrap.service";

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
@Module({
  imports: [TenancyModule, ObservabilityModule, WorkflowEngineModule, NumberingModule, NotificationModule, AuditModule, IncidentModule, EnvironmentalModule],
  controllers: [CapaRegisterController],
  providers: [
    CapaWorkflowBootstrapService,
    CapaRegisterService,
    CapaRootCauseAnalysisService,
    CapaActionPlanService,
    CapaActionPlanWorkflowCompletionListener,
    CapaEffectivenessVerificationService,
    CapaEffectivenessVerificationWorkflowCompletionListener,
    CapaApprovalCacheService,
    AuditFindingCapaTriggerListener,
    EnvironmentalMonitoringCapaTriggerListener,
    CapaRootCauseSlaScanQueueService,
    CapaRootCauseSlaScanService,
    CapaEffectivenessVerificationDueScanQueueService,
    CapaEffectivenessVerificationDueScanService,
  ],
  exports: [CapaRegisterService, CapaRootCauseAnalysisService, CapaActionPlanService, CapaEffectivenessVerificationService, CapaApprovalCacheService],
})
export class CapaModule {}
