"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationWorkerModule = void 0;
const common_1 = require("@nestjs/common");
const observability_module_1 = require("../../../platform/observability/observability.module");
const tenancy_module_1 = require("../../../platform/tenancy/tenancy.module");
const reminder_scan_service_1 = require("./reminder-scan.service");
// Modul SLIM khusus proses worker (apps/worker) — pola sama
// WorkflowEngineWorkerModule (0.9) / AuditLogWorkerModule (0.13): tidak ada
// HTTP/guard/JWT, cuma yang genuinely dibutuhkan ReminderScanService.
let OrganizationWorkerModule = class OrganizationWorkerModule {
};
exports.OrganizationWorkerModule = OrganizationWorkerModule;
exports.OrganizationWorkerModule = OrganizationWorkerModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule, observability_module_1.ObservabilityModule],
        providers: [reminder_scan_service_1.ReminderScanService],
        exports: [reminder_scan_service_1.ReminderScanService],
    })
], OrganizationWorkerModule);
//# sourceMappingURL=organization-worker.module.js.map