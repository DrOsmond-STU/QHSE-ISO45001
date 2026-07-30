import { Module } from "@nestjs/common";
import { NotificationModule } from "../../../platform/notification/notification.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { GasRetestDueScanService } from "./gas-retest-due-scan.service";
import { WorkPermitExpiryScanService } from "./work-permit-expiry-scan.service";

// Modul SLIM khusus proses worker (apps/worker) — pola sama
// HiraJsaHiradcWorkerModule (3.2)/DmsWorkerModule (2.1): TIDAK ada
// HTTP/guard/JWT, TIDAK ada *QueueService (producer)/WorkflowCompletionListener
// (reaksi ke actOnTask() yang jalan di apps/api) — cuma 2 scan service
// yang genuinely dikonsumsi worker (task 3.4).
@Module({
  imports: [TenancyModule, ObservabilityModule, NotificationModule],
  providers: [WorkPermitExpiryScanService, GasRetestDueScanService],
  exports: [WorkPermitExpiryScanService, GasRetestDueScanService],
})
export class WorkPermitWorkerModule {}
