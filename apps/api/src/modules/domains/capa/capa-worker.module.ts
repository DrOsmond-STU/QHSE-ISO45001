import { Module } from "@nestjs/common";
import { NotificationModule } from "../../../platform/notification/notification.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { CapaEffectivenessVerificationDueScanService } from "./capa-effectiveness-verification-due-scan.service";
import { CapaRootCauseSlaScanService } from "./capa-root-cause-sla-scan.service";

// Modul SLIM khusus proses worker (apps/worker) — pola sama
// AuditWorkerModule (4.1): TIDAK ada HTTP/guard/JWT, TIDAK ada
// *QueueService (producer). DUA scan service (murni baca+notifikasi/
// update kolom idempotency, tidak membuat baris baru), jadi TIDAK butuh
// NumberingModule/WorkflowEngineModule di sini.
@Module({
  imports: [TenancyModule, ObservabilityModule, NotificationModule],
  providers: [CapaRootCauseSlaScanService, CapaEffectivenessVerificationDueScanService],
  exports: [CapaRootCauseSlaScanService, CapaEffectivenessVerificationDueScanService],
})
export class CapaWorkerModule {}
