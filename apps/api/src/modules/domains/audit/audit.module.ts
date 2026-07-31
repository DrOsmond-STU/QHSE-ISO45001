import { Module } from "@nestjs/common";
import { NotificationModule } from "../../../platform/notification/notification.module";
import { NumberingModule } from "../../../platform/numbering/numbering.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { WorkflowEngineModule } from "../../../platform/workflow-engine/workflow-engine.module";
import { AuditAuditeeScopeService } from "./audit-auditee-scope.service";
import { AuditChecklistService } from "./audit-checklist.service";
import { AuditFindingClosureDueScanQueueService } from "./audit-finding-closure-due-scan-queue.service";
import { AuditFindingClosureDueScanService } from "./audit-finding-closure-due-scan.service";
import { AuditFindingService } from "./audit-finding.service";
import { AuditProgramService } from "./audit-program.service";
import { AuditProgramWorkflowCompletionListener } from "./audit-program-workflow-completion.listener";
import { AuditReportService } from "./audit-report.service";
import { AuditReportWorkflowCompletionListener } from "./audit-report-workflow-completion.listener";
import { AuditTeamMemberService } from "./audit-team-member.service";
import { AuditTypeService } from "./audit-type.service";
import { AuditWorkflowBootstrapService } from "./audit-workflow-bootstrap.service";
import { AuditController } from "./audit.controller";
import { AuditService } from "./audit.service";
import { AuditorCompetencyExpiryScanQueueService } from "./auditor-competency-expiry-scan-queue.service";
import { AuditorCompetencyExpiryScanService } from "./auditor-competency-expiry-scan.service";
import { AuditorCompetencyRecordService } from "./auditor-competency-record.service";

// Task 4.1 (Modul 09 Audit Management) — modul DOMAIN KEDUA BELAS.
// Mereferensikan documents (Modul 03) via FK Prisma LANGSUNG (TIDAK
// mengimpor DmsModule). PERTAMA KALI satu modul domain butuh DUA
// workflow_definitions process sekaligus (audit_program, audit_report —
// lihat banner comment schema.prisma). 2 job cron baru
// (auditor-competency-expiry-scan 05:15, audit-finding-closure-due-scan
// 05:30) — konsumennya jalan di proses worker terpisah (lihat
// apps/worker/src/*.worker.ts + AuditWorkerModule) — TIDAK didaftarkan DI SINI.
@Module({
  imports: [TenancyModule, ObservabilityModule, WorkflowEngineModule, NumberingModule, NotificationModule],
  controllers: [AuditController],
  providers: [
    AuditWorkflowBootstrapService,
    AuditTypeService,
    AuditChecklistService,
    AuditProgramService,
    AuditProgramWorkflowCompletionListener,
    AuditService,
    AuditTeamMemberService,
    AuditAuditeeScopeService,
    AuditFindingService,
    AuditorCompetencyRecordService,
    AuditReportService,
    AuditReportWorkflowCompletionListener,
    AuditorCompetencyExpiryScanQueueService,
    AuditorCompetencyExpiryScanService,
    AuditFindingClosureDueScanQueueService,
    AuditFindingClosureDueScanService,
  ],
  exports: [
    AuditTypeService,
    AuditChecklistService,
    AuditProgramService,
    AuditService,
    AuditTeamMemberService,
    AuditAuditeeScopeService,
    AuditFindingService,
    AuditorCompetencyRecordService,
    AuditReportService,
  ],
})
export class AuditModule {}
