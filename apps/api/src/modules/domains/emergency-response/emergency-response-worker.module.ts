import { Module } from "@nestjs/common";
import { NotificationModule } from "../../../platform/notification/notification.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { EmergencyPlanReviewOverdueScanService } from "./emergency-plan-review-overdue-scan.service";

// Modul SLIM khusus proses worker (apps/worker) — pola sama
// IncidentWorkerModule (3.5)/InspectionWorkerModule (3.6): TIDAK ada HTTP/
// guard/JWT, TIDAK ada *QueueService (producer). Hanya SATU scan service
// (EmergencyPlanReviewOverdueScanService) — TIDAK py dependensi transitif
// ke service domain manapun (murni baca+notifikasi, tidak membuat baris
// baru spt InspectionRecordGenerationScanService 3.6), jadi TIDAK butuh
// NumberingModule di sini.
@Module({
  imports: [TenancyModule, ObservabilityModule, NotificationModule],
  providers: [EmergencyPlanReviewOverdueScanService],
  exports: [EmergencyPlanReviewOverdueScanService],
})
export class EmergencyResponseWorkerModule {}
