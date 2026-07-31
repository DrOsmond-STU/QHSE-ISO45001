import { Module } from "@nestjs/common";
import { AttachmentWorkerModule } from "../../../platform/attachment/attachment-worker.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { UserRoleWorkerModule } from "../user-role/user-role-worker.module";
import { UsageCounterScanService } from "./provisioning/usage-counter-scan.service";
import { UsageCounterService } from "./provisioning/usage-counter.service";
import { DataImportPollService } from "./data-import/data-import-poll.service";
import { DataImportProcessingService } from "./data-import/data-import-processing.service";
import { DATA_IMPORT_ROW_MAPPERS } from "./data-import/row-mappers/data-import-row-mapper.interface";
import { DataImportRowMapperRegistry } from "./data-import/row-mappers/data-import-row-mapper-registry.service";
import { EmployeeRowMapper } from "./data-import/row-mappers/employee-row-mapper";

// Modul SLIM khusus proses worker (apps/worker) — pola sama
// OrganizationWorkerModule (1.1)/UserRoleWorkerModule (1.4): tidak ada
// HTTP/guard/JWT, cuma yang genuinely dibutuhkan. Task 1.6 menambah
// AttachmentWorkerModule (ObjectStorageService, baca stream Excel) +
// UserRoleWorkerModule (UserService, dipakai EmployeeRowMapper) +
// DataImportProcessingService/registry mapper-nya sendiri — TIDAK
// termasuk DataImportQueueService (producer, cuma dipakai sisi apps/api
// createJob()/confirmImport()) — worker CUMA konsumen job, pola sama
// persis AttachmentWorkerModule vs AttachmentModule (0.12).
@Module({
  imports: [TenancyModule, ObservabilityModule, AttachmentWorkerModule, UserRoleWorkerModule],
  providers: [
    UsageCounterService,
    UsageCounterScanService,
    EmployeeRowMapper,
    {
      provide: DATA_IMPORT_ROW_MAPPERS,
      useFactory: (employeeMapper: EmployeeRowMapper) => [employeeMapper],
      inject: [EmployeeRowMapper],
    },
    DataImportRowMapperRegistry,
    DataImportProcessingService,
    // Shared-hosting adaptation (REDIS_ENABLED=false) — pengganti
    // data-import.worker.ts, dipicu CronRunnerController.
    DataImportPollService,
  ],
  exports: [UsageCounterScanService, DataImportProcessingService, DataImportPollService],
})
export class SystemAdministrationWorkerModule {}
