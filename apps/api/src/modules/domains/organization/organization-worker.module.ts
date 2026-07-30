import { Module } from "@nestjs/common";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { ReminderScanService } from "./reminder-scan.service";

// Modul SLIM khusus proses worker (apps/worker) — pola sama
// WorkflowEngineWorkerModule (0.9) / AuditLogWorkerModule (0.13): tidak ada
// HTTP/guard/JWT, cuma yang genuinely dibutuhkan ReminderScanService.
@Module({
  imports: [TenancyModule, ObservabilityModule],
  providers: [ReminderScanService],
  exports: [ReminderScanService],
})
export class OrganizationWorkerModule {}
