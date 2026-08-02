"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HolidayCalendarService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../platform/tenancy/prisma.service");
const organization_context_1 = require("../organization-context");
const holiday_calendar_1 = require("./holiday-calendar");
// Task 1.2 (Modul 01 §5) — holiday_calendars/holiday_calendar_entries
// tenant-scoped biasa (RLS via withRls(), pola sama OrganizationService
// 1.1) — beda dari IndustryTemplateService (katalog global) di folder yang
// sama. BELUM ada controller HTTP (pola sama 1.1).
let HolidayCalendarService = class HolidayCalendarService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    /** BR-05 (PRD Modul 01 §6) — hanya SATU kalender per tenant boleh
     * is_default=true. isDefault:true di sini otomatis meng-unset kalender
     * default sebelumnya (kalau ada) dalam TRANSAKSI YANG SAMA (pola "set as
     * default" umum) alih-alih menolak create — PRD tidak eksplisit
     * reject-vs-auto-unset, auto-unset dipilih supaya caller tidak perlu
     * retry manual unset-lalu-set. TIDAK pakai DB partial unique index
     * (PRD §5 eksplisit: "constraint aplikasi, bukan hanya DB unique index
     * sederhana karena melibatkan soft-delete filter") — enforcement murni
     * di sini. */
    async createCalendar(input) {
        const createdBy = (0, organization_context_1.requireActorUserId)();
        const tenantId = (0, organization_context_1.requireTenantId)();
        return this.prisma.withRls(async (tx) => {
            if (input.isDefault) {
                await tx.holidayCalendar.updateMany({
                    where: { tenantId, isDefault: true, deletedAt: null },
                    data: { isDefault: false, updatedBy: createdBy },
                });
            }
            return tx.holidayCalendar.create({
                data: { ...input, tenantId, createdBy, updatedBy: createdBy },
            });
        });
    }
    /** Toggle kalender YANG SUDAH ADA jadi default tenant — BR-05 sama
     * seperti createCalendar({isDefault:true}), method terpisah supaya
     * caller tidak perlu re-submit seluruh field kalender cuma untuk pindah
     * default. */
    async setAsDefault(holidayCalendarId) {
        const updatedBy = (0, organization_context_1.requireActorUserId)();
        const tenantId = (0, organization_context_1.requireTenantId)();
        return this.prisma.withRls(async (tx) => {
            await tx.holidayCalendar.updateMany({
                where: { tenantId, isDefault: true, deletedAt: null },
                data: { isDefault: false, updatedBy },
            });
            return tx.holidayCalendar.update({
                where: { id: holidayCalendarId },
                data: { isDefault: true, updatedBy },
            });
        });
    }
    async addEntry(input) {
        const createdBy = (0, organization_context_1.requireActorUserId)();
        const tenantId = (0, organization_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.holidayCalendarEntry.create({
            data: { ...input, tenantId, createdBy, updatedBy: createdBy },
        }));
    }
    /** PRD Modul 01 §5 — holiday_calendar_entries TIDAK punya deletedAt
     * (satu-satunya tabel domain tanpa soft delete): "baris dihapus langsung
     * tiap pergantian tahun cukup aman karena bukan record transaksional
     * legal." Hard delete SENGAJA, bukan oversight. */
    async removeEntry(holidayEntryId) {
        await this.prisma.withRls((tx) => tx.holidayCalendarEntry.delete({ where: { id: holidayEntryId } }));
    }
    async listEntries(holidayCalendarId) {
        return this.prisma.withRls((tx) => tx.holidayCalendarEntry.findMany({ where: { holidayCalendarId }, orderBy: { holidayDate: "asc" } }));
    }
    /** PRD Modul 01 §5 "sites.holiday_calendar_id NULL = pakai kalender
     * default tenant" — resolve ke SATU kalender efektif. Bisa null (BR-05
     * membatasi MAKSIMAL satu default per tenant, tidak MEWAJIBKAN tenant
     * punya satu — tenant baru pra-konfigurasi kalender adalah kondisi
     * valid, bukan error). */
    async resolveEffectiveCalendar(siteId) {
        return this.prisma.withRls(async (tx) => {
            const site = await tx.site.findUniqueOrThrow({ where: { id: siteId }, select: { holidayCalendarId: true, tenantId: true } });
            if (site.holidayCalendarId) {
                return tx.holidayCalendar.findUnique({ where: { id: site.holidayCalendarId } });
            }
            return tx.holidayCalendar.findFirst({ where: { tenantId: site.tenantId, isDefault: true, status: "ACTIVE" } });
        });
    }
    /** Primitif siap-pakai utk SLA business-day aware (acceptance criterion
     * literal TASK_INSTRUCTION.md 1.2: "jika berlaku") — gabungan
     * resolveEffectiveCalendar() + isBusinessDay() (holiday-calendar.ts) satu
     * panggilan. SENGAJA belum dipanggil workflow-sla-scan.worker.ts (0.9) —
     * belum ada permintaan task eksplisit, gap didokumentasikan TDD §26,
     * pola sama ApproverResolutionService.ROLE_IN_SCOPE (task 1.1 gap #23). */
    async isBusinessDayForSite(siteId, date) {
        const calendar = await this.resolveEffectiveCalendar(siteId);
        if (!calendar)
            return (0, holiday_calendar_1.isBusinessDay)(date, []);
        const entries = await this.listEntries(calendar.id);
        return (0, holiday_calendar_1.isBusinessDay)(date, entries);
    }
};
exports.HolidayCalendarService = HolidayCalendarService;
exports.HolidayCalendarService = HolidayCalendarService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HolidayCalendarService);
//# sourceMappingURL=holiday-calendar.service.js.map