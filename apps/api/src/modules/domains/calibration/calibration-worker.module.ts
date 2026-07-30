import { Module } from "@nestjs/common";
import { NotificationModule } from "../../../platform/notification/notification.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { CalibrationDueScanService } from "./calibration-due-scan.service";

// Modul SLIM khusus proses worker (apps/worker) — pola sama
// AssetEquipmentWorkerModule (6.1): TIDAK ada HTTP/guard/JWT, TIDAK ada
// *QueueService (producer). Satu scan service (baca+notifikasi/update
// kolom idempotency+status OVERDUE, tidak membuat baris baru), jadi TIDAK
// butuh NumberingModule/WorkflowEngineModule/AuditLogModule di sini.
@Module({
  imports: [TenancyModule, ObservabilityModule, NotificationModule],
  providers: [CalibrationDueScanService],
  exports: [CalibrationDueScanService],
})
export class CalibrationWorkerModule {}
