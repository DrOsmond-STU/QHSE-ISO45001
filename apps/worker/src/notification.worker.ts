import { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Job, Queue, Worker } from "bullmq";
import Redis from "ioredis";
// Deep subpath import ke dist compiled @qhse/api — pola sama persis
// workflow-sla-scan.worker.ts (task 0.9), lihat komentar di sana.
import { NotificationDeliveryJobPayload } from "@qhse/api/dist/platform/notification/notification-delivery-job.types";
import { NotificationDeliveryService } from "@qhse/api/dist/platform/notification/notification-delivery.service";
import {
  NOTIFICATION_DEAD_LETTER_QUEUE,
  NOTIFICATION_DELIVERY_JOB_NAME,
  NOTIFICATION_MAX_ATTEMPTS,
  NOTIFICATION_QUEUE,
} from "@qhse/api/dist/platform/notification/notification.constants";
import { NotificationWorkerModule } from "@qhse/api/dist/platform/notification/notification-worker.module";

export interface NotificationWorkerHandle {
  appContext: INestApplicationContext;
  worker: Worker;
  deadLetterQueue: Queue;
}

/**
 * TDD §10/§13.1 — konsumen BullMQ notification-queue. ApplicationContext
 * di-boot SEKALI, NotificationDeliveryService di-resolve SEKALI, dipakai
 * ulang lintas job — pola sama persis
 * workflow-sla-scan.worker.ts::bootstrapWorkflowSlaScanWorker (task 0.9).
 * BEDA: queue ini reaktif (banyak job kecil, satu per pengiriman) alih-alih
 * satu repeatable cron job, jadi concurrency > 1 supaya kegagalan/lambatnya
 * satu pengiriman tidak memblokir antrian pengiriman lain.
 */
export async function bootstrapNotificationWorker(): Promise<NotificationWorkerHandle> {
  const appContext = await NestFactory.createApplicationContext(NotificationWorkerModule, {
    logger: ["log", "warn", "error"],
  });
  const deliveryService = appContext.get(NotificationDeliveryService);

  // Koneksi ioredis SENDIRI (bukan reuse apa pun dari apps/api) — BullMQ
  // Worker wajib maxRetriesPerRequest:null (pola sama task 0.9).
  const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
  const deadLetterQueue = new Queue(NOTIFICATION_DEAD_LETTER_QUEUE, { connection });

  const worker = new Worker(
    NOTIFICATION_QUEUE,
    async (job: Job<NotificationDeliveryJobPayload>) => {
      await deliveryService.processDeliveryJob(job.data, {
        attemptsMade: job.attemptsMade,
        maxAttempts: job.opts.attempts ?? NOTIFICATION_MAX_ATTEMPTS,
      });
    },
    { connection, concurrency: 5 },
  );

  worker.on("completed", (job) => {
    // eslint-disable-next-line no-console
    console.log(`[qhse-worker] ${NOTIFICATION_QUEUE} job ${job.id} (log ${job.data.notificationLogId}) terkirim.`);
  });

  worker.on("failed", (job, err) => {
    const maxAttempts = job?.opts.attempts ?? NOTIFICATION_MAX_ATTEMPTS;
    const isFinalFailure = (job?.attemptsMade ?? 0) >= maxAttempts;

    // TDD §13.2 — job gagal: alert, bukan diam-diam log. Alert sungguhan
    // (Alertmanager/Grafana, TDD §15) masih infra terpisah yang belum ada —
    // Pino terstruktur (AppLoggerService, task 0.13) sudah tersedia tapi
    // worker ini belum diretrofit memakainya (di luar cakupan 0.13, TDD §26).
    // structured console error di bawah placeholder eksplisit sementara,
    // pola sama workflow-sla-scan.worker.ts (task 0.9).
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        queue: NOTIFICATION_QUEUE,
        jobId: job?.id,
        notificationLogId: job?.data?.notificationLogId,
        attemptsMade: job?.attemptsMade,
        maxAttempts,
        permanent: isFinalFailure,
        error: err instanceof Error ? err.message : String(err),
      }),
    );

    // Acceptance criterion task 0.11 — "kegagalan permanen masuk
    // dead-letter + entry FAILED (tidak hilang diam-diam)". Entry FAILED
    // sudah ditulis NotificationDeliveryService (single writer
    // notification_logs, lihat komentar di sana) SEBELUM rethrow yang
    // memicu event 'failed' ini — push ke dead-letter queue di sini
    // melengkapi separuh kedua acceptance criterion, HANYA saat percobaan
    // benar-benar habis (bukan tiap retry intermediate).
    if (isFinalFailure && job) {
      deadLetterQueue.add(NOTIFICATION_DELIVERY_JOB_NAME, job.data, { removeOnComplete: false }).catch((dlqErr) => {
        // eslint-disable-next-line no-console
        console.error(`[qhse-worker] gagal push job ${job.id} ke dead-letter queue: ${dlqErr}`);
      });
    }
  });

  return { appContext, worker, deadLetterQueue };
}
