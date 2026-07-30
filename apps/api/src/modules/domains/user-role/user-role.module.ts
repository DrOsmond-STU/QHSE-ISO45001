import { Module } from "@nestjs/common";
import { AuditLogModule } from "../../../platform/audit-log/audit-log.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { DelegationOfAuthorityService } from "./delegation/delegation-of-authority.service";
import { DelegationScanQueueService } from "./delegation/delegation-scan-queue.service";
import { DelegationScanService } from "./delegation/delegation-scan.service";
import { RoleService } from "./role.service";
import { SsoMappingService } from "./sso-mapping.service";
import { UserService } from "./user.service";

// Task 1.3 — modul domain KEDUA (src/modules/domains/*, setelah
// OrganizationModule 1.1). UserService/RoleService/SsoMappingService
// BELUM ada controller HTTP (pola sama 1.1/1.2) — dites langsung lewat
// integration test. TIDAK impor OrganizationModule (BR-03 scope
// validation query Prisma langsung, lihat banner comment
// UserService.assertScopeBelongsToTenant()) maupun sebaliknya — kedua
// modul domain independen satu sama lain, sama-sama hanya bergantung pada
// platform/*.
//
// Task 1.4 (Delegation of Authority) — DelegationScanService JUGA
// terdaftar di sini (bukan cuma di UserRoleWorkerModule slim) supaya
// integration test bisa app.get(DelegationScanService).scan() langsung
// tanpa proses worker BullMQ sungguhan, pola sama ReminderScanService di
// OrganizationModule (1.1).
@Module({
  imports: [TenancyModule, AuditLogModule, ObservabilityModule],
  providers: [
    UserService,
    RoleService,
    SsoMappingService,
    DelegationOfAuthorityService,
    DelegationScanService,
    DelegationScanQueueService,
  ],
  exports: [UserService, RoleService, SsoMappingService, DelegationOfAuthorityService, DelegationScanService],
})
export class UserRoleModule {}
