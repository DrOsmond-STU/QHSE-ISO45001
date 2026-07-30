import { Module } from "@nestjs/common";
import { NotificationModule } from "../../../platform/notification/notification.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { MaintenanceDueScanService } from "./maintenance-due-scan.service";

// Modul SLIM khusus proses worker (apps/worker) — pola sama
// EnvironmentalWorkerModule (5.2): TIDAK ada HTTP/guard/JWT, TIDAK ada
// *QueueService (producer). Satu scan service (murni baca+notifikasi/
// update kolom idempotency, tidak membuat baris baru), jadi TIDAK butuh
// NumberingModule/WorkflowEngineModule di sini.
@Module({
  imports: [TenancyModule, ObservabilityModule, NotificationModule],
  providers: [MaintenanceDueScanService],
  exports: [MaintenanceDueScanService],
})
export class AssetEquipmentWorkerModule {}
