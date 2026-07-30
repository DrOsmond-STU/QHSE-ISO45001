import { Module } from "@nestjs/common";
import { ObservabilityModule } from "../observability/observability.module";
import { AuditLogPartitionMaintenanceService } from "./audit-log-partition-maintenance.service";

// Modul SLIM khusus proses worker (apps/worker) — pola sama
// WorkflowEngineWorkerModule (0.9): tidak ada HTTP/guard/JWT, cuma yang
// genuinely dibutuhkan AuditLogPartitionMaintenanceService. TenancyModule
// TIDAK diimpor di sini — job ini murni DDL cross-tenant (adminPrisma
// sendiri, DATABASE_URL), tidak pernah panggil withRls()/PrismaService.
@Module({
  imports: [ObservabilityModule],
  providers: [AuditLogPartitionMaintenanceService],
  exports: [AuditLogPartitionMaintenanceService],
})
export class AuditLogWorkerModule {}
