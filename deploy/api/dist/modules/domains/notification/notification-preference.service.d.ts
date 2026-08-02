import { NotificationChannelCode, NotificationDeliveryMode } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { PreferenceMatrixCell } from "./preference-matrix";
export interface UpsertPreferenceInput {
    eventCategory: string;
    channelCode: NotificationChannelCode;
    isEnabled: boolean;
    deliveryMode?: NotificationDeliveryMode;
    quietHoursStart?: string | null;
    quietHoursEnd?: string | null;
}
/**
 * Modul 25 §12 "Halaman Preferensi Notifikasi" — Acceptance
 * TASK_INSTRUCTION.md 1.7: "preferensi user dihormati sebelum kirim
 * (bukan hanya default sistem)". Pembuktian bahwa preferensi ITU SENDIRI
 * dihormati sudah ada (0.11, `resolveAdditionalChannels()` +
 * `notification-channel-resolution.spec.ts`) — tugas modul ini murni
 * menyediakan CARA user mengubah baris `notification_preferences` yang
 * dibaca fungsi itu, lewat matriks (event_category x channel) yang bisa
 * di-upsert per cell.
 */
export declare class NotificationPreferenceService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getMatrixForCurrentUser(): Promise<PreferenceMatrixCell[]>;
    upsertPreference(input: UpsertPreferenceInput): Promise<PreferenceMatrixCell>;
}
