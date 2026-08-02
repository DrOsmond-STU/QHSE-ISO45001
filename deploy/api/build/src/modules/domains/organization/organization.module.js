"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationModule = void 0;
const common_1 = require("@nestjs/common");
const observability_module_1 = require("../../../platform/observability/observability.module");
const tenancy_module_1 = require("../../../platform/tenancy/tenancy.module");
const reminder_scan_queue_service_1 = require("./reminder-scan-queue.service");
const reminder_scan_service_1 = require("./reminder-scan.service");
const organization_service_1 = require("./organization.service");
const industry_template_service_1 = require("./industry-template/industry-template.service");
const holiday_calendar_service_1 = require("./industry-template/holiday-calendar.service");
// Task 1.1 — modul domain PERTAMA (apps/api/src/modules/domains/*, beda dari
// platform/* Phase 0 — lihat ARCHITECTURE.md §4). Belum ada controller HTTP
// (Goal literal TASK_INSTRUCTION.md 1.1 cuma minta tabel + service resolusi
// hierarki, lihat banner comment organization.service.ts) — OrganizationService
// dipakai in-process oleh modul domain lain mulai dibangun.
//
// Resolusi hierarki utk RBAC scope filter (acceptance criterion literal
// 1.1) hidup di platform/rbac/prisma-scope-hierarchy.resolver.ts, BUKAN di
// sini — lihat banner comment-nya kenapa (arah dependency modular monolith:
// domain boleh impor platform, platform TIDAK impor domain). Modul ini
// TIDAK mengimpor RbacModule ATAU sebaliknya.
let OrganizationModule = class OrganizationModule {
};
exports.OrganizationModule = OrganizationModule;
exports.OrganizationModule = OrganizationModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule, observability_module_1.ObservabilityModule],
        providers: [
            organization_service_1.OrganizationService,
            reminder_scan_service_1.ReminderScanService,
            reminder_scan_queue_service_1.ReminderScanQueueService,
            industry_template_service_1.IndustryTemplateService,
            holiday_calendar_service_1.HolidayCalendarService,
        ],
        exports: [organization_service_1.OrganizationService, industry_template_service_1.IndustryTemplateService, holiday_calendar_service_1.HolidayCalendarService],
    })
], OrganizationModule);
