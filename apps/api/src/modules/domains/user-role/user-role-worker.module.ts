import { Module } from "@nestjs/common";
import { AuditLogModule } from "../../../platform/audit-log/audit-log.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { DelegationScanService } from "./delegation/delegation-scan.service";
import { UserService } from "./user.service";

// Modul SLIM khusus proses worker (apps/worker) — pola sama
// OrganizationWorkerModule (1.1) / WorkflowEngineWorkerModule (0.9): tidak
// ada HTTP/guard/JWT, cuma yang genuinely dibutuhkan.
//
// Task 1.6 — UserService (+ AuditLogModule utk dependency-nya) ditambahkan
// BARU di sini: EmployeeRowMapper (system-administration/data-import,
// dipanggil DataImportProcessingService SISI WORKER saat fase IMPORTING)
// reuse UserService.inviteUser() apa adanya — UserService sendiri kelas
// service murni (bukan controller/guard), aman masuk modul slim ini tanpa
// melanggar semangat "tidak ada HTTP/guard/JWT".
@Module({
  imports: [TenancyModule, ObservabilityModule, AuditLogModule],
  providers: [DelegationScanService, UserService],
  exports: [DelegationScanService, UserService],
})
export class UserRoleWorkerModule {}
