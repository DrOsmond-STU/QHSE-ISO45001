import { Module } from "@nestjs/common";
import { NotificationModule } from "../../../platform/notification/notification.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { WasteStorageDurationScanService } from "./waste-storage-duration-scan.service";

// Modul SLIM khusus proses worker (apps/worker) — pola sama
// CapaWorkerModule (4.2): TIDAK ada HTTP/guard/JWT, TIDAK ada
// *QueueService (producer). Satu scan service (murni baca+notifikasi/
// update kolom idempotency, tidak membuat baris baru), jadi TIDAK butuh
// NumberingModule/WorkflowEngineModule di sini.
@Module({
  imports: [TenancyModule, ObservabilityModule, NotificationModule],
  providers: [WasteStorageDurationScanService],
  exports: [WasteStorageDurationScanService],
})
export class EnvironmentalWorkerModule {}
