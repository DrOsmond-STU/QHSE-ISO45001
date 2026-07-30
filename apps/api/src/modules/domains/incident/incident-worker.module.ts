import { Module } from "@nestjs/common";
import { NotificationModule } from "../../../platform/notification/notification.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { IncidentRegulatoryReportOverdueScanService } from "./incident-regulatory-report-overdue-scan.service";
import { IncidentStatisticsRecalcScanService } from "./incident-statistics-recalc-scan.service";

// Modul SLIM khusus proses worker (apps/worker) — pola sama
// WorkPermitWorkerModule (3.4): TIDAK ada HTTP/guard/JWT, TIDAK ada
// *QueueService (producer)/WorkflowCompletionListener (reaksi ke
// actOnTask() yang jalan di apps/api) — cuma 2 scan service yang genuinely
// dikonsumsi worker (task 3.5).
@Module({
  imports: [TenancyModule, ObservabilityModule, NotificationModule],
  providers: [IncidentRegulatoryReportOverdueScanService, IncidentStatisticsRecalcScanService],
  exports: [IncidentRegulatoryReportOverdueScanService, IncidentStatisticsRecalcScanService],
})
export class IncidentWorkerModule {}
