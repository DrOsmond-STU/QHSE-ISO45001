import { Module } from "@nestjs/common";
import { NotificationModule } from "../../../platform/notification/notification.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { QualityComplaintResponseSlaScanService } from "./quality-complaint-response-sla-scan.service";

// Modul SLIM khusus proses worker (apps/worker) — pola sama CapaWorkerModule
// (4.2): TIDAK ada HTTP/guard/JWT, TIDAK ada *QueueService (producer).
@Module({
  imports: [TenancyModule, ObservabilityModule, NotificationModule],
  providers: [QualityComplaintResponseSlaScanService],
  exports: [QualityComplaintResponseSlaScanService],
})
export class QualityWorkerModule {}
