import { Module } from "@nestjs/common";
import { NotificationModule } from "../../../platform/notification/notification.module";
import { NumberingModule } from "../../../platform/numbering/numbering.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { WorkflowEngineModule } from "../../../platform/workflow-engine/workflow-engine.module";
import { IncidentCorrectiveActionLinkService } from "./incident-corrective-action-link.service";
import { IncidentInvestigationService } from "./incident-investigation.service";
import { IncidentRegulatoryReportOverdueScanQueueService } from "./incident-regulatory-report-overdue-scan-queue.service";
import { IncidentRegulatoryReportOverdueScanService } from "./incident-regulatory-report-overdue-scan.service";
import { IncidentRegulatoryReportService } from "./incident-regulatory-report.service";
import { IncidentStatisticsCacheService } from "./incident-statistics-cache.service";
import { IncidentStatisticsRecalcScanQueueService } from "./incident-statistics-recalc-scan-queue.service";
import { IncidentStatisticsRecalcScanService } from "./incident-statistics-recalc-scan.service";
import { IncidentWitnessStatementService } from "./incident-witness-statement.service";
import { IncidentWorkflowBootstrapService } from "./incident-workflow-bootstrap.service";
import { IncidentWorkflowCompletionListener } from "./incident-workflow-completion.listener";
import { IncidentReportController } from "./incident-report.controller";
import { IncidentReportService } from "./incident-report.service";

// Task 3.5 (Modul 07 Incident Management) — modul DOMAIN KESEMBILAN, hanya
// mereferensikan work_permits (Modul 06) via FK Prisma langsung, TIDAK
// mengimpor WorkPermitModule. 2 job cron baru (incident-regulatory-report-
// overdue-scan BR-09, incident-statistics-recalc-scan BR-06) — konsumennya
// jalan di proses worker terpisah (lihat apps/worker/src/*.worker.ts +
// IncidentWorkerModule) — TIDAK didaftarkan DI SINI, pola sama seluruh job
// lain codebase ini.
@Module({
  imports: [TenancyModule, ObservabilityModule, WorkflowEngineModule, NumberingModule, NotificationModule],
  controllers: [IncidentReportController],
  providers: [
    IncidentWorkflowBootstrapService,
    IncidentReportService,
    IncidentInvestigationService,
    IncidentWorkflowCompletionListener,
    IncidentCorrectiveActionLinkService,
    IncidentWitnessStatementService,
    IncidentRegulatoryReportService,
    IncidentRegulatoryReportOverdueScanQueueService,
    IncidentRegulatoryReportOverdueScanService,
    IncidentStatisticsCacheService,
    IncidentStatisticsRecalcScanQueueService,
    IncidentStatisticsRecalcScanService,
  ],
  exports: [
    IncidentReportService,
    IncidentInvestigationService,
    IncidentCorrectiveActionLinkService,
    IncidentWitnessStatementService,
    IncidentRegulatoryReportService,
    IncidentStatisticsCacheService,
  ],
})
export class IncidentModule {}
