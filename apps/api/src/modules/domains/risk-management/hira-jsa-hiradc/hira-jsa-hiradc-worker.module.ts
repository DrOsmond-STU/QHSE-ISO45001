import { Module } from "@nestjs/common";
import { NotificationModule } from "../../../../platform/notification/notification.module";
import { ObservabilityModule } from "../../../../platform/observability/observability.module";
import { TenancyModule } from "../../../../platform/tenancy/tenancy.module";
import { HiraReviewDueScanService } from "./hira-review-due-scan.service";
import { HiradcExpiryScanService } from "./hiradc-expiry-scan.service";
import { RiskRegisterReviewScanService } from "./risk-register-review-scan.service";

// Modul SLIM khusus proses worker (apps/worker) — pola sama
// DmsWorkerModule (2.1)/RegulatoryComplianceWorkerModule (2.2): TIDAK ada
// HTTP/guard/JWT, TIDAK ada *QueueService (producer)/WorkflowCompletionListener
// (reaksi ke actOnTask() yang jalan di apps/api) — cuma 3 scan service
// yang genuinely dikonsumsi worker.
@Module({
  imports: [TenancyModule, ObservabilityModule, NotificationModule],
  providers: [HiradcExpiryScanService, RiskRegisterReviewScanService, HiraReviewDueScanService],
  exports: [HiradcExpiryScanService, RiskRegisterReviewScanService, HiraReviewDueScanService],
})
export class HiraJsaHiradcWorkerModule {}
