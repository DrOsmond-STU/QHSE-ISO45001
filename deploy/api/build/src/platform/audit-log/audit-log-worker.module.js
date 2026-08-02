"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogWorkerModule = void 0;
const common_1 = require("@nestjs/common");
const observability_module_1 = require("../observability/observability.module");
const audit_log_partition_maintenance_service_1 = require("./audit-log-partition-maintenance.service");
// Modul SLIM khusus proses worker (apps/worker) — pola sama
// WorkflowEngineWorkerModule (0.9): tidak ada HTTP/guard/JWT, cuma yang
// genuinely dibutuhkan AuditLogPartitionMaintenanceService. TenancyModule
// TIDAK diimpor di sini — job ini murni DDL cross-tenant (adminPrisma
// sendiri, DATABASE_URL), tidak pernah panggil withRls()/PrismaService.
let AuditLogWorkerModule = class AuditLogWorkerModule {
};
exports.AuditLogWorkerModule = AuditLogWorkerModule;
exports.AuditLogWorkerModule = AuditLogWorkerModule = __decorate([
    (0, common_1.Module)({
        imports: [observability_module_1.ObservabilityModule],
        providers: [audit_log_partition_maintenance_service_1.AuditLogPartitionMaintenanceService],
        exports: [audit_log_partition_maintenance_service_1.AuditLogPartitionMaintenanceService],
    })
], AuditLogWorkerModule);
