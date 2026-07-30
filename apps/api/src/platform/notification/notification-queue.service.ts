import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { NotificationDeliveryJobPayload } from "./notification-delivery-job.types";
import {
  NOTIFICATION_BACKOFF_BASE_DELAY_MS,
  NOTIFICATION_DELIVERY_JOB_NAME,
  NOTIFICATION_MAX_ATTEMPTS,
  NOTIFICATION_QUEUE,
} from "./notification.constants";

// Sisi producer BullMQ (TDD §13.1), pola sama persis
// workflow-sla-queue.service.ts (task 0.9): koneksi ioredis SENDIRI (bukan
// reuse auth/redis.provider.ts) — BullMQ WAJIB maxRetriesPerRequest:null.
// BEDA dari workflow-sla-queue: queue ini REAKTIF (satu job per pengiriman,
// dipicu event), bukan repeatable cron — jadi tidak ada
// onApplicationBootstrap, cuma method enqueue dipanggil NotificationService
// per event.
@Injectable()
export class NotificationQueueService implements OnModuleDestroy {
  private readonly connection: Redis;
  private readonly queue: Queue<NotificationDeliveryJobPayload>;

  constructor() {
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(NOTIFICATION_QUEUE, { connection: this.connection });
  }

  /**
   * TASK_INSTRUCTION.md §0.11 — "retry exponential backoff max 5x". Job
   * TIDAK di-remove otomatis saat gagal (`removeOnFail: false`) — tetap
   * ada di failed-set BullMQ sebagai jejak tambahan di luar dead-letter
   * queue eksplisit (lihat worker.on('failed') di
   * apps/worker/src/notification.worker.ts) dan notification_logs status
   * FAILED, supaya "tidak hilang diam-diam" (acceptance criterion) benar
   * di tiga tempat sekaligus.
   */
  async enqueueDelivery(payload: NotificationDeliveryJobPayload): Promise<void> {
    await this.queue.add(NOTIFICATION_DELIVERY_JOB_NAME, payload, {
      attempts: NOTIFICATION_MAX_ATTEMPTS,
      backoff: { type: "exponential", delay: NOTIFICATION_BACKOFF_BASE_DELAY_MS },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
