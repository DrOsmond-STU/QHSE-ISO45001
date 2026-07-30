import { Module } from "@nestjs/common";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { ReminderScanQueueService } from "./reminder-scan-queue.service";
import { ReminderScanService } from "./reminder-scan.service";
import { OrganizationService } from "./organization.service";
import { IndustryTemplateService } from "./industry-template/industry-template.service";
import { HolidayCalendarService } from "./industry-template/holiday-calendar.service";

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
@Module({
  imports: [TenancyModule, ObservabilityModule],
  providers: [
    OrganizationService,
    ReminderScanService,
    ReminderScanQueueService,
    IndustryTemplateService,
    HolidayCalendarService,
  ],
  exports: [OrganizationService, IndustryTemplateService, HolidayCalendarService],
})
export class OrganizationModule {}
