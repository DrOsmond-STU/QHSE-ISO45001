import { Module } from "@nestjs/common";
import { NotificationModule } from "../../../platform/notification/notification.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { McuReminderScanService } from "./mcu-reminder-scan.service";
import { OccupationalHealthReassessmentScanService } from "./occupational-health-reassessment-scan.service";

// Modul SLIM khusus proses worker (apps/worker) — pola sama
// EnvironmentalWorkerModule (5.2): TIDAK ada HTTP/guard/JWT, TIDAK ada
// *QueueService (producer). DUA scan service (murni baca+notifikasi/update
// kolom idempotency, tidak membuat baris baru), TIDAK butuh
// NumberingModule/WorkflowEngineModule/RbacModule/FieldEncryptionModule
// di sini.
@Module({
  imports: [TenancyModule, ObservabilityModule, NotificationModule],
  providers: [McuReminderScanService, OccupationalHealthReassessmentScanService],
  exports: [McuReminderScanService, OccupationalHealthReassessmentScanService],
})
export class OccupationalHealthWorkerModule {}
