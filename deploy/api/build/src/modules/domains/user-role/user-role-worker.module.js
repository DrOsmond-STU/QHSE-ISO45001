"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRoleWorkerModule = void 0;
const common_1 = require("@nestjs/common");
const audit_log_module_1 = require("../../../platform/audit-log/audit-log.module");
const observability_module_1 = require("../../../platform/observability/observability.module");
const tenancy_module_1 = require("../../../platform/tenancy/tenancy.module");
const delegation_scan_service_1 = require("./delegation/delegation-scan.service");
const user_service_1 = require("./user.service");
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
let UserRoleWorkerModule = class UserRoleWorkerModule {
};
exports.UserRoleWorkerModule = UserRoleWorkerModule;
exports.UserRoleWorkerModule = UserRoleWorkerModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule, observability_module_1.ObservabilityModule, audit_log_module_1.AuditLogModule],
        providers: [delegation_scan_service_1.DelegationScanService, user_service_1.UserService],
        exports: [delegation_scan_service_1.DelegationScanService, user_service_1.UserService],
    })
], UserRoleWorkerModule);
