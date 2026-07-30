import { Module } from "@nestjs/common";
import { NotificationModule } from "../../../platform/notification/notification.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { ContractorDueScanService } from "./contractor-due-scan.service";

// Modul SLIM khusus proses worker (apps/worker) — pola sama
// CalibrationWorkerModule (6.2): TIDAK ada HTTP/guard/JWT, TIDAK ada
// *QueueService (producer). Satu scan service (baca+notifikasi/update
// kolom idempotency+status EXPIRED, tidak membuat baris baru), jadi TIDAK
// butuh NumberingModule/WorkflowEngineModule/AuditLogModule di sini.
@Module({
  imports: [TenancyModule, ObservabilityModule, NotificationModule],
  providers: [ContractorDueScanService],
  exports: [ContractorDueScanService],
})
export class ContractorWorkerModule {}
