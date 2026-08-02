import { NotificationChannelCode, NotificationPriority } from "@prisma/client";
export interface QuietHoursWindow {
    /** Menit sejak tengah malam UTC, 0-1439. */
    startMinutes: number;
    endMinutes: number;
}
/**
 * Modul 25 §5 `quiet_hours_start/end` — jendela HARIAN berulang, BISA
 * melewati tengah malam (mis. 22:00-07:00, umum utk "jangan ganggu malam
 * hari"). start===end diperlakukan sebagai "tidak ada jendela" (tidak
 * pernah quiet) alih-alih ambigu 24 jam penuh.
 */
export declare function isWithinQuietHours(nowMinutes: number, window: QuietHoursWindow): boolean;
export interface TenantChannelConfig {
    channelCode: NotificationChannelCode;
    isEnabled: boolean;
}
export interface UserChannelPreference {
    channelCode: NotificationChannelCode;
    isEnabled: boolean;
    quietHours: QuietHoursWindow | null;
}
export type AdditionalChannelCode = Extract<NotificationChannelCode, "EMAIL" | "WHATSAPP" | "TELEGRAM">;
/**
 * Master PRD Modul 25 §4.1/§6 — resolusi kanal TAMBAHAN (di luar IN_APP)
 * yang benar-benar dikirimi untuk SATU event. Urutan aturan (paling
 * menang duluan):
 *
 * 1. **BR-03**: `notification_channels.is_enabled=false` (tenant-level) ->
 *    exclude, MUTLAK, tidak ada override apa pun termasuk CRITICAL.
 * 2. **Preferensi user**: `is_enabled=false`/tidak ada baris preferensi
 *    untuk channel ini -> exclude. BR-01 "WAJIB minimal satu channel
 *    real-time" DIBACA sebagai "abaikan quiet_hours", BUKAN "abaikan
 *    preferensi channel user" — user yang eksplisit mematikan WhatsApp
 *    tidak tiba-tiba menerima WhatsApp cuma karena satu notifikasi
 *    CRITICAL (mereka tetap dapat IN_APP, satu-satunya yang BR-02 jamin
 *    tidak bisa dimatikan). Interpretasi ini didokumentasikan sebagai gap
 *    di TDD §26 karena BR-01 sendiri tidak eksplisit soal urutan menang
 *    lawan preferensi user.
 * 3. **Quiet hours**: kalau priority BUKAN CRITICAL dan `now` ada di
 *    jendela quiet hours user untuk channel ini -> exclude. CRITICAL
 *    selalu bypass quiet hours (BR-01, eksplisit).
 */
export declare function resolveAdditionalChannels(priority: NotificationPriority, tenantChannels: TenantChannelConfig[], userPreferences: UserChannelPreference[], nowMinutes: number): AdditionalChannelCode[];
