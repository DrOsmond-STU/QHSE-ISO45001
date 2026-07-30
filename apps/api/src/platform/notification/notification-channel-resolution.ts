import { NotificationChannelCode, NotificationPriority } from "@prisma/client";

// Pure logic — tanpa Prisma/DB, mirror gaya workflow-transition-evaluation.ts
// (task 0.9). IN_APP SENGAJA tidak muncul di sini — BR-02 (Modul 25 §6)
// bikin IN_APP selalu dibuat NotificationService secara langsung/sinkron,
// tidak lewat resolusi kanal opsional ini maupun lewat BullMQ queue (tidak
// ada "provider" eksternal yang bisa gagal utk in-app, cuma insert row).

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
export function isWithinQuietHours(nowMinutes: number, window: QuietHoursWindow): boolean {
  const { startMinutes, endMinutes } = window;
  if (startMinutes === endMinutes) return false;
  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  // Melewati tengah malam.
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

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

const ADDITIONAL_CHANNELS: AdditionalChannelCode[] = ["EMAIL", "WHATSAPP", "TELEGRAM"];

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
export function resolveAdditionalChannels(
  priority: NotificationPriority,
  tenantChannels: TenantChannelConfig[],
  userPreferences: UserChannelPreference[],
  nowMinutes: number,
): AdditionalChannelCode[] {
  return ADDITIONAL_CHANNELS.filter((channelCode) => {
    const tenantConfig = tenantChannels.find((c) => c.channelCode === channelCode);
    if (!tenantConfig?.isEnabled) return false;

    const preference = userPreferences.find((p) => p.channelCode === channelCode);
    if (!preference?.isEnabled) return false;

    if (priority !== "CRITICAL" && preference.quietHours && isWithinQuietHours(nowMinutes, preference.quietHours)) {
      return false;
    }

    return true;
  });
}
