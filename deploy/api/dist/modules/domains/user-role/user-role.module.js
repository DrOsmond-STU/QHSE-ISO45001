"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRoleModule = void 0;
const common_1 = require("@nestjs/common");
const audit_log_module_1 = require("../../../platform/audit-log/audit-log.module");
const observability_module_1 = require("../../../platform/observability/observability.module");
const tenancy_module_1 = require("../../../platform/tenancy/tenancy.module");
const delegation_of_authority_service_1 = require("./delegation/delegation-of-authority.service");
const delegation_scan_queue_service_1 = require("./delegation/delegation-scan-queue.service");
const delegation_scan_service_1 = require("./delegation/delegation-scan.service");
const role_service_1 = require("./role.service");
const sso_mapping_service_1 = require("./sso-mapping.service");
const user_service_1 = require("./user.service");
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
let UserRoleModule = class UserRoleModule {
};
exports.UserRoleModule = UserRoleModule;
exports.UserRoleModule = UserRoleModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule, audit_log_module_1.AuditLogModule, observability_module_1.ObservabilityModule],
        providers: [
            user_service_1.UserService,
            role_service_1.RoleService,
            sso_mapping_service_1.SsoMappingService,
            delegation_of_authority_service_1.DelegationOfAuthorityService,
            delegation_scan_service_1.DelegationScanService,
            delegation_scan_queue_service_1.DelegationScanQueueService,
        ],
        exports: [user_service_1.UserService, role_service_1.RoleService, sso_mapping_service_1.SsoMappingService, delegation_of_authority_service_1.DelegationOfAuthorityService, delegation_scan_service_1.DelegationScanService],
    })
], UserRoleModule);
//# sourceMappingURL=user-role.module.js.map