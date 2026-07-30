import { Module } from "@nestjs/common";
import { AttachmentModule } from "../../../platform/attachment/attachment.module";
import { AuditLogModule } from "../../../platform/audit-log/audit-log.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { OrganizationModule } from "../organization/organization.module";
import { UserRoleModule } from "../user-role/user-role.module";
import { TenantBrandingService } from "./branding/tenant-branding.service";
import { EntitlementService } from "./provisioning/entitlement.service";
import { ProvisioningService } from "./provisioning/provisioning.service";
import { SubscriptionPlanService } from "./provisioning/subscription-plan.service";
import { UsageCounterScanQueueService } from "./provisioning/usage-counter-scan-queue.service";
import { UsageCounterScanService } from "./provisioning/usage-counter-scan.service";
import { UsageCounterService } from "./provisioning/usage-counter.service";
import { DataImportProcessingService } from "./data-import/data-import-processing.service";
import { DataImportQueueService } from "./data-import/data-import-queue.service";
import { DataImportService } from "./data-import/data-import.service";
import { DATA_IMPORT_ROW_MAPPERS } from "./data-import/row-mappers/data-import-row-mapper.interface";
import { DataImportRowMapperRegistry } from "./data-import/row-mappers/data-import-row-mapper-registry.service";
import { EmployeeRowMapper } from "./data-import/row-mappers/employee-row-mapper";

// Task 1.5 — modul domain KETIGA. MODUL DOMAIN PERTAMA yang mengimpor
// modul domain LAIN (OrganizationModule utk IndustryTemplateService,
// UserRoleModule utk UserService) — ProvisioningService.provisionTenant()
// genuinely butuh orkestrasi lintas kedua modul itu (bukan platform/*
// yang TIDAK BOLEH impor domain sama sekali — lihat banner comment
// ProvisioningService). ProvisioningService/EntitlementService/
// SubscriptionPlanService/UsageCounterService/DataImportService/
// TenantBrandingService BELUM ada controller HTTP (pola sama 1.1-1.5).
//
// EntitlementGuard (BR-01) SENGAJA TIDAK didaftarkan di sini — hidup di
// platform/entitlement/ (lihat banner comment EntitlementCheckService
// kenapa query Prisma langsung, bukan impor service modul ini) dan
// diregistrasi terpisah lewat EntitlementModule di app.module.ts.
//
// Task 1.6 — AttachmentModule diimpor BARU di sini (utk ObjectStorageService,
// dipakai DataImportProcessingService baca stream file Excel). EmployeeRowMapper
// dirakit jadi array DATA_IMPORT_ROW_MAPPERS lewat factory provider (pola
// standar NestJS utk "kumpulkan N provider jadi 1 token array" — NestJS
// TIDAK py `multi: true` ala Angular) — menambah mapper baru cukup tambah
// providers-nya + masukkan ke factory array/inject di sini, TIDAK ada
// perubahan DataImportRowMapperRegistry/DataImportService/
// DataImportProcessingService.
@Module({
  imports: [TenancyModule, ObservabilityModule, AuditLogModule, OrganizationModule, UserRoleModule, AttachmentModule],
  providers: [
    SubscriptionPlanService,
    EntitlementService,
    UsageCounterService,
    ProvisioningService,
    UsageCounterScanService,
    UsageCounterScanQueueService,
    TenantBrandingService,
    EmployeeRowMapper,
    {
      provide: DATA_IMPORT_ROW_MAPPERS,
      useFactory: (employeeMapper: EmployeeRowMapper) => [employeeMapper],
      inject: [EmployeeRowMapper],
    },
    DataImportRowMapperRegistry,
    DataImportQueueService,
    DataImportService,
    DataImportProcessingService,
  ],
  exports: [
    SubscriptionPlanService,
    EntitlementService,
    UsageCounterService,
    ProvisioningService,
    UsageCounterScanService,
    TenantBrandingService,
    DataImportService,
    DataImportProcessingService,
  ],
})
export class SystemAdministrationModule {}
