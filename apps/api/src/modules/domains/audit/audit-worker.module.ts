import { Module } from "@nestjs/common";
import { NotificationModule } from "../../../platform/notification/notification.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { AuditFindingClosureDueScanService } from "./audit-finding-closure-due-scan.service";
import { AuditorCompetencyExpiryScanService } from "./auditor-competency-expiry-scan.service";

// Modul SLIM khusus proses worker (apps/worker) — pola sama
// EmergencyResponseWorkerModule (3.7): TIDAK ada HTTP/guard/JWT, TIDAK ada
// *QueueService (producer). DUA scan service (murni baca+notifikasi/
// transisi status sederhana, tidak membuat baris baru), jadi TIDAK butuh
// NumberingModule/WorkflowEngineModule di sini.
@Module({
  imports: [TenancyModule, ObservabilityModule, NotificationModule],
  providers: [AuditorCompetencyExpiryScanService, AuditFindingClosureDueScanService],
  exports: [AuditorCompetencyExpiryScanService, AuditFindingClosureDueScanService],
})
export class AuditWorkerModule {}
