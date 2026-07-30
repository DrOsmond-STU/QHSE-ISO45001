import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../tenancy/prisma.service";
import { tenantContextStorage } from "../tenancy/tenant-context";
import { NotificationDeliveryJobPayload } from "./notification-delivery-job.types";
import { NOTIFICATION_PROVIDER, NotificationProvider, NotificationSendResult } from "./notification-provider.interface";

export interface DeliveryAttemptContext {
  /** BullMQ `job.attemptsMade` SEBELUM percobaan ini berjalan (0 pada
   * percobaan pertama, 1 pada retry pertama, dst). */
  attemptsMade: number;
  maxAttempts: number;
}

/**
 * Sisi worker (dipanggil apps/worker/src/notification.worker.ts per job
 * `notification-queue`, proses TERPISAH dari apps/api — lihat
 * notification-delivery-job.types.ts). Single writer notification_logs:
 * SEMUA transisi status (SENT/FAILED/tetap QUEUED nunggu retry) ditulis DI
 * SINI, bukan juga di worker.on('failed') (yang cuma urus dead-letter
 * queue + alert placeholder) — menghindari race dua tempat menulis baris
 * yang sama.
 */
@Injectable()
export class NotificationDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(NOTIFICATION_PROVIDER) private readonly provider: NotificationProvider,
  ) {}

  /**
   * Sukses -> notification_logs SENT. Gagal -> attempt_count naik +
   * status FAILED HANYA kalau ini percobaan TERAKHIR (masih QUEUED kalau
   * BullMQ akan retry lagi), lalu RETHROW supaya BullMQ tetap menjadwalkan
   * retry/backoff-nya sendiri (exponential, TASK_INSTRUCTION §0.11) — throw
   * di sini BUKAN mekanisme dead-letter itu sendiri, cuma sinyal ke BullMQ.
   */
  async processDeliveryJob(payload: NotificationDeliveryJobPayload, context: DeliveryAttemptContext): Promise<void> {
    const isFinalAttempt = context.attemptsMade + 1 >= context.maxAttempts;

    await tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
      try {
        const result = await this.callProvider(payload);
        await this.prisma.withRls((tx) =>
          tx.notificationLog.update({
            where: { id: payload.notificationLogId },
            data: {
              status: "SENT",
              sentAt: new Date(),
              attemptCount: { increment: 1 },
              providerMessageId: result.providerMessageId,
              providerResponse: (result.raw as Prisma.InputJsonValue) ?? Prisma.JsonNull,
            },
          }),
        );
      } catch (err) {
        await this.prisma.withRls((tx) =>
          tx.notificationLog.update({
            where: { id: payload.notificationLogId },
            data: {
              status: isFinalAttempt ? "FAILED" : "QUEUED",
              attemptCount: { increment: 1 },
              providerResponse: { error: err instanceof Error ? err.message : String(err) },
            },
          }),
        );
        throw err;
      }
    });
  }

  private async callProvider(payload: NotificationDeliveryJobPayload): Promise<NotificationSendResult> {
    if (payload.channelCode === "EMAIL") {
      return this.provider.sendEmail({ toEmail: payload.recipientAddress, subject: payload.subject ?? "", body: payload.body });
    }
    if (payload.channelCode === "WHATSAPP") {
      return this.provider.sendWhatsApp({ toAddress: payload.recipientAddress, body: payload.body });
    }
    return this.provider.sendTelegram({ toAddress: payload.recipientAddress, body: payload.body });
  }
}
