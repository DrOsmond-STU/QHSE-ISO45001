import { NotificationChannelCode, NotificationDeliveryMode } from "@prisma/client";
import { EVENT_CATEGORIES } from "./event-category";

// Kanal yang benar-benar toggleable user — IN_APP TIDAK, BR-02 Modul 25 §6
// ("channel IN_APP tidak dapat dinonaktifkan user") ditegakkan di sini
// dgn TIDAK PERNAH menghasilkan cell IN_APP yang editable=true, bukan
// cuma di layer validasi upsert (defense in depth, sama pola mapper
// row-import 1.6 yg validateRow() DAN importRow() sama-sama menjaga).
const EDITABLE_CHANNELS: readonly NotificationChannelCode[] = ["EMAIL", "WHATSAPP", "TELEGRAM"];

export interface ExistingPreferenceRow {
  eventCategory: string;
  channelCode: NotificationChannelCode;
  isEnabled: boolean;
  deliveryMode: NotificationDeliveryMode;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

export interface PreferenceMatrixCell {
  eventCategory: string;
  categoryLabel: string;
  channelCode: NotificationChannelCode;
  isEnabled: boolean;
  editable: boolean;
  deliveryMode: NotificationDeliveryMode | null;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

/**
 * Modul 25 §12 "matriks kategori event x channel". Baris yang TIDAK ADA
 * di `existingRows` (user belum pernah menyentuh toggle ini) TAMPIL
 * `isEnabled=false` utk channel eksternal — BUKAN default kolom skema
 * `is_enabled=true` — supaya persis cocok dgn perilaku ENFORCEMENT
 * `resolveAdditionalChannels()` (0.11, `platform/notification/
 * notification-channel-resolution.ts`, test eksplisit "user belum opt-in
 * (tidak ada baris preferensi) -> exclude, default aman bukan opt-out").
 * Menampilkan `true` di sini padahal backend men-exclude-nya akan jadi UI
 * yang BERBOHONG ke user. IN_APP SELALU `isEnabled=true, editable=false`
 * tanpa perlu baris DB apa pun (BR-02, tidak pernah bisa dimatikan).
 */
export function buildPreferenceMatrix(existingRows: readonly ExistingPreferenceRow[]): PreferenceMatrixCell[] {
  const cells: PreferenceMatrixCell[] = [];

  for (const category of EVENT_CATEGORIES) {
    cells.push({
      eventCategory: category.code,
      categoryLabel: category.label,
      channelCode: "IN_APP",
      isEnabled: true,
      editable: false,
      deliveryMode: null,
      quietHoursStart: null,
      quietHoursEnd: null,
    });

    for (const channelCode of EDITABLE_CHANNELS) {
      const existing = existingRows.find((r) => r.eventCategory === category.code && r.channelCode === channelCode);
      cells.push({
        eventCategory: category.code,
        categoryLabel: category.label,
        channelCode,
        isEnabled: existing?.isEnabled ?? false,
        editable: true,
        deliveryMode: existing?.deliveryMode ?? null,
        quietHoursStart: existing?.quietHoursStart ?? null,
        quietHoursEnd: existing?.quietHoursEnd ?? null,
      });
    }
  }

  return cells;
}
