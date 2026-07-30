import { BadRequestException, Injectable } from "@nestjs/common";
import { NotificationChannelCode, NotificationDeliveryMode } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { getCategoryLabel, isKnownEventCategory } from "./event-category";
import { requireActorUserId, requireTenantId } from "./notification-context";
import { dateToTimeString, isValidTimeString, timeStringToDate } from "./notification-time";
import { buildPreferenceMatrix, PreferenceMatrixCell } from "./preference-matrix";

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
@Injectable()
export class NotificationPreferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async getMatrixForCurrentUser(): Promise<PreferenceMatrixCell[]> {
    const userId = requireActorUserId();
    const rows = await this.prisma.withRls((tx) => tx.notificationPreference.findMany({ where: { userId } }));

    return buildPreferenceMatrix(
      rows.map((row) => ({
        eventCategory: row.eventCategory,
        channelCode: row.channelCode,
        isEnabled: row.isEnabled,
        deliveryMode: row.deliveryMode,
        quietHoursStart: dateToTimeString(row.quietHoursStart),
        quietHoursEnd: dateToTimeString(row.quietHoursEnd),
      })),
    );
  }

  async upsertPreference(input: UpsertPreferenceInput): Promise<PreferenceMatrixCell> {
    const userId = requireActorUserId();
    const tenantId = requireTenantId();

    // BR-02 Modul 25 §6 — "channel IN_APP tidak dapat dinonaktifkan
    // user" — ditegakkan LAGI di sini (defense in depth, lihat banner
    // comment preference-matrix.ts) di titik masuk WRITE yang sungguhan.
    if (input.channelCode === "IN_APP") {
      throw new BadRequestException('BR-02: channel IN_APP tidak dapat diubah — selalu aktif, tidak bisa dimatikan.');
    }
    if (!isKnownEventCategory(input.eventCategory)) {
      throw new BadRequestException(`event_category "${input.eventCategory}" tidak dikenal.`);
    }
    if (input.quietHoursStart !== undefined && input.quietHoursStart !== null && !isValidTimeString(input.quietHoursStart)) {
      throw new BadRequestException(`Format quietHoursStart tidak valid: "${input.quietHoursStart}" (harapkan "HH:mm").`);
    }
    if (input.quietHoursEnd !== undefined && input.quietHoursEnd !== null && !isValidTimeString(input.quietHoursEnd)) {
      throw new BadRequestException(`Format quietHoursEnd tidak valid: "${input.quietHoursEnd}" (harapkan "HH:mm").`);
    }

    const quietHoursStart = timeStringToDate(input.quietHoursStart);
    const quietHoursEnd = timeStringToDate(input.quietHoursEnd);

    const row = await this.prisma.withRls((tx) =>
      tx.notificationPreference.upsert({
        where: {
          userId_eventCategory_channelCode: {
            userId,
            eventCategory: input.eventCategory,
            channelCode: input.channelCode,
          },
        },
        create: {
          tenantId,
          userId,
          eventCategory: input.eventCategory,
          channelCode: input.channelCode,
          isEnabled: input.isEnabled,
          deliveryMode: input.deliveryMode ?? "REAL_TIME",
          quietHoursStart,
          quietHoursEnd,
        },
        update: {
          isEnabled: input.isEnabled,
          ...(input.deliveryMode ? { deliveryMode: input.deliveryMode } : {}),
          quietHoursStart,
          quietHoursEnd,
        },
      }),
    );

    return {
      eventCategory: row.eventCategory,
      categoryLabel: getCategoryLabel(row.eventCategory),
      channelCode: row.channelCode,
      isEnabled: row.isEnabled,
      editable: true,
      deliveryMode: row.deliveryMode,
      quietHoursStart: dateToTimeString(row.quietHoursStart),
      quietHoursEnd: dateToTimeString(row.quietHoursEnd),
    };
  }
}
