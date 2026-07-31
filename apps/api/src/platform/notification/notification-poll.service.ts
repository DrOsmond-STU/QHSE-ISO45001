import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppLoggerService } from "../observability/app-logger.service";
import { PrismaService } from "../tenancy/prisma.service";
import { tenantContextStorage } from "../tenancy/tenant-context";
import { NotificationDeliveryService } from "./notification-delivery.service";
import { NotificationDeliveryJobPayload } from "./notification-delivery-job.types";
import { NOTIFICATION_MAX_ATTEMPTS } from "./notification.constants";

const POLL_BATCH_SIZE = 100;

// Shared-hosting adaptation (REDIS_ENABLED=false) — pengganti
// notification.worker.ts (konsumen BullMQ `notification-queue`), dipanggil
// CronRunnerController lewat cron tick yang sama dgn 31 scan job (pola
// PERSIS *-due-scan.service.ts: admin Prisma cross-tenant SELECT DISTINCT
// tenant_id, lalu per-tenant withRls()). subject/body/recipientAddress
// SUDAH dipersist NotificationService.enqueue() (lihat banner comment
// NotificationLog schema.prisma) — TIDAK perlu render ulang di sini.
@Injectable()
export class NotificationPollService implements OnModuleDestroy {
  private readonly adminPrisma: PrismaClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly deliveryService: NotificationDeliveryService,
    private readonly logger: AppLoggerService,
  ) {
    this.adminPrisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  }

  async onModuleDestroy(): Promise<void> {
    await this.adminPrisma.$disconnect();
  }

  async tick(now: Date = new Date()): Promise<void> {
    const rows = await this.adminPrisma.$queryRaw<Array<{ tenant_id: string }>>`
      SELECT DISTINCT tenant_id FROM notification_logs
      WHERE status = 'QUEUED'
        AND channel_code IN ('EMAIL', 'WHATSAPP', 'TELEGRAM')
        AND (next_attempt_at IS NULL OR next_attempt_at <= ${now})
    `;

    for (const row of rows) {
      try {
        await this.tickForTenant(row.tenant_id, now);
      } catch (err) {
        this.logger.event("error", "notification-poll gagal untuk satu tenant", {
          module: "notification",
          action: "notification-poll.tenant-failed",
          tenant_id: row.tenant_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async tickForTenant(tenantId: string, now: Date): Promise<void> {
    const dueLogs = await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls((tx) =>
        tx.notificationLog.findMany({
          where: {
            tenantId,
            status: "QUEUED",
            channelCode: { in: ["EMAIL", "WHATSAPP", "TELEGRAM"] },
            OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
          },
          take: POLL_BATCH_SIZE,
        }),
      ),
    );

    let processed = 0;
    for (const log of dueLogs) {
      if (log.channelCode !== "EMAIL" && log.channelCode !== "WHATSAPP" && log.channelCode !== "TELEGRAM") continue;
      const payload: NotificationDeliveryJobPayload = {
        tenantId,
        notificationLogId: log.id,
        channelCode: log.channelCode,
        recipientAddress: log.recipientAddress ?? "",
        subject: log.subject ?? undefined,
        body: log.body ?? "",
      };

      try {
        await this.deliveryService.processDeliveryJob(payload, { attemptsMade: log.attemptCount, maxAttempts: NOTIFICATION_MAX_ATTEMPTS });
        processed += 1;
      } catch {
        // processDeliveryJob() SUDAH menulis status QUEUED (masih ada sisa
        // percobaan)/FAILED (percobaan terakhir) + attempt_count ke DB (lihat
        // notification-delivery.service.ts) — di sini CUMA menjadwalkan
        // next_attempt_at supaya tick berikutnya tidak langsung retry baris
        // yang barusan gagal (pengganti exponential backoff BullMQ; skala
        // menit bukan detik krn cadence tick ditentukan cron, bukan job
        // queue instan — lihat panduan deployment rekomendasi interval).
        const backoffMinutes = 2 ** log.attemptCount;
        await tenantContextStorage.run({ tenantId }, () =>
          this.prisma.withRls((tx) =>
            tx.notificationLog.updateMany({
              where: { id: log.id, status: "QUEUED" },
              data: { nextAttemptAt: new Date(now.getTime() + backoffMinutes * 60_000) },
            }),
          ),
        );
      }
    }

    if (dueLogs.length > 0) {
      this.logger.event("info", "notification-poll: baris diproses", {
        module: "notification",
        action: "notification-poll.tenant-processed",
        tenant_id: tenantId,
        due_count: dueLogs.length,
        processed_count: processed,
      });
    }
  }
}
