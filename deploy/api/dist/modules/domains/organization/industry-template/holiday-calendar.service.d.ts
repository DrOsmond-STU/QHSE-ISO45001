import { HolidayCalendar, HolidayCalendarEntry } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
export interface CreateHolidayCalendarInput {
    name: string;
    appliesToSiteId?: string;
    country?: string;
    isDefault?: boolean;
}
export interface CreateHolidayCalendarEntryInput {
    holidayCalendarId: string;
    holidayDate: Date;
    name: string;
    isRecurringYearly?: boolean;
}
export declare class HolidayCalendarService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    /** BR-05 (PRD Modul 01 §6) — hanya SATU kalender per tenant boleh
     * is_default=true. isDefault:true di sini otomatis meng-unset kalender
     * default sebelumnya (kalau ada) dalam TRANSAKSI YANG SAMA (pola "set as
     * default" umum) alih-alih menolak create — PRD tidak eksplisit
     * reject-vs-auto-unset, auto-unset dipilih supaya caller tidak perlu
     * retry manual unset-lalu-set. TIDAK pakai DB partial unique index
     * (PRD §5 eksplisit: "constraint aplikasi, bukan hanya DB unique index
     * sederhana karena melibatkan soft-delete filter") — enforcement murni
     * di sini. */
    createCalendar(input: CreateHolidayCalendarInput): Promise<HolidayCalendar>;
    /** Toggle kalender YANG SUDAH ADA jadi default tenant — BR-05 sama
     * seperti createCalendar({isDefault:true}), method terpisah supaya
     * caller tidak perlu re-submit seluruh field kalender cuma untuk pindah
     * default. */
    setAsDefault(holidayCalendarId: string): Promise<HolidayCalendar>;
    addEntry(input: CreateHolidayCalendarEntryInput): Promise<HolidayCalendarEntry>;
    /** PRD Modul 01 §5 — holiday_calendar_entries TIDAK punya deletedAt
     * (satu-satunya tabel domain tanpa soft delete): "baris dihapus langsung
     * tiap pergantian tahun cukup aman karena bukan record transaksional
     * legal." Hard delete SENGAJA, bukan oversight. */
    removeEntry(holidayEntryId: string): Promise<void>;
    listEntries(holidayCalendarId: string): Promise<HolidayCalendarEntry[]>;
    /** PRD Modul 01 §5 "sites.holiday_calendar_id NULL = pakai kalender
     * default tenant" — resolve ke SATU kalender efektif. Bisa null (BR-05
     * membatasi MAKSIMAL satu default per tenant, tidak MEWAJIBKAN tenant
     * punya satu — tenant baru pra-konfigurasi kalender adalah kondisi
     * valid, bukan error). */
    resolveEffectiveCalendar(siteId: string): Promise<HolidayCalendar | null>;
    /** Primitif siap-pakai utk SLA business-day aware (acceptance criterion
     * literal TASK_INSTRUCTION.md 1.2: "jika berlaku") — gabungan
     * resolveEffectiveCalendar() + isBusinessDay() (holiday-calendar.ts) satu
     * panggilan. SENGAJA belum dipanggil workflow-sla-scan.worker.ts (0.9) —
     * belum ada permintaan task eksplisit, gap didokumentasikan TDD §26,
     * pola sama ApproverResolutionService.ROLE_IN_SCOPE (task 1.1 gap #23). */
    isBusinessDayForSite(siteId: string, date: Date): Promise<boolean>;
}
