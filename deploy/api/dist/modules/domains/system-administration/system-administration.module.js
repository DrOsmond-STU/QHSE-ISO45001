"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemAdministrationModule = void 0;
const common_1 = require("@nestjs/common");
const attachment_module_1 = require("../../../platform/attachment/attachment.module");
const audit_log_module_1 = require("../../../platform/audit-log/audit-log.module");
const observability_module_1 = require("../../../platform/observability/observability.module");
const tenancy_module_1 = require("../../../platform/tenancy/tenancy.module");
const organization_module_1 = require("../organization/organization.module");
const user_role_module_1 = require("../user-role/user-role.module");
const tenant_branding_service_1 = require("./branding/tenant-branding.service");
const entitlement_service_1 = require("./provisioning/entitlement.service");
const provisioning_service_1 = require("./provisioning/provisioning.service");
const subscription_plan_service_1 = require("./provisioning/subscription-plan.service");
const usage_counter_scan_queue_service_1 = require("./provisioning/usage-counter-scan-queue.service");
const usage_counter_scan_service_1 = require("./provisioning/usage-counter-scan.service");
const usage_counter_service_1 = require("./provisioning/usage-counter.service");
const data_import_processing_service_1 = require("./data-import/data-import-processing.service");
const data_import_queue_service_1 = require("./data-import/data-import-queue.service");
const data_import_service_1 = require("./data-import/data-import.service");
const data_import_row_mapper_interface_1 = require("./data-import/row-mappers/data-import-row-mapper.interface");
const data_import_row_mapper_registry_service_1 = require("./data-import/row-mappers/data-import-row-mapper-registry.service");
const employee_row_mapper_1 = require("./data-import/row-mappers/employee-row-mapper");
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
let SystemAdministrationModule = class SystemAdministrationModule {
};
exports.SystemAdministrationModule = SystemAdministrationModule;
exports.SystemAdministrationModule = SystemAdministrationModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule, observability_module_1.ObservabilityModule, audit_log_module_1.AuditLogModule, organization_module_1.OrganizationModule, user_role_module_1.UserRoleModule, attachment_module_1.AttachmentModule],
        providers: [
            subscription_plan_service_1.SubscriptionPlanService,
            entitlement_service_1.EntitlementService,
            usage_counter_service_1.UsageCounterService,
            provisioning_service_1.ProvisioningService,
            usage_counter_scan_service_1.UsageCounterScanService,
            usage_counter_scan_queue_service_1.UsageCounterScanQueueService,
            tenant_branding_service_1.TenantBrandingService,
            employee_row_mapper_1.EmployeeRowMapper,
            {
                provide: data_import_row_mapper_interface_1.DATA_IMPORT_ROW_MAPPERS,
                useFactory: (employeeMapper) => [employeeMapper],
                inject: [employee_row_mapper_1.EmployeeRowMapper],
            },
            data_import_row_mapper_registry_service_1.DataImportRowMapperRegistry,
            data_import_queue_service_1.DataImportQueueService,
            data_import_service_1.DataImportService,
            data_import_processing_service_1.DataImportProcessingService,
        ],
        exports: [
            subscription_plan_service_1.SubscriptionPlanService,
            entitlement_service_1.EntitlementService,
            usage_counter_service_1.UsageCounterService,
            provisioning_service_1.ProvisioningService,
            usage_counter_scan_service_1.UsageCounterScanService,
            tenant_branding_service_1.TenantBrandingService,
            data_import_service_1.DataImportService,
            data_import_processing_service_1.DataImportProcessingService,
        ],
    })
], SystemAdministrationModule);
//# sourceMappingURL=system-administration.module.js.map