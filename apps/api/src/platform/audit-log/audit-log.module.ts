import { Module } from "@nestjs/common";
import { ObservabilityModule } from "../observability/observability.module";
import { TenancyModule } from "../tenancy/tenancy.module";
import { AuditLogPartitionMaintenanceQueueService } from "./audit-log-partition-maintenance-queue.service";
import { AuditLogPartitionMaintenanceService } from "./audit-log-partition-maintenance.service";
import { AuditLogService } from "./audit-log.service";

@Module({
  imports: [TenancyModule, ObservabilityModule],
  providers: [AuditLogService, AuditLogPartitionMaintenanceService, AuditLogPartitionMaintenanceQueueService],
  // AuditLogPartitionMaintenanceService diekspor juga (bukan cuma
  // AuditLogService) — dipanggil langsung dari integration test
  // (test/audit-log/partition-maintenance.integration-spec.ts) untuk
  // membuktikan acceptance criterion tanpa menunggu jadwal cron sungguhan,
  // pola sama WorkflowSlaScanService diekspos test lewat app.get().
  exports: [AuditLogService, AuditLogPartitionMaintenanceService],
})
export class AuditLogModule {}
