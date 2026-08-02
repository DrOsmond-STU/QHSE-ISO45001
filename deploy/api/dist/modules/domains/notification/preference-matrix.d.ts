import { NotificationChannelCode, NotificationDeliveryMode } from "@prisma/client";
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
export declare function buildPreferenceMatrix(existingRows: readonly ExistingPreferenceRow[]): PreferenceMatrixCell[];
