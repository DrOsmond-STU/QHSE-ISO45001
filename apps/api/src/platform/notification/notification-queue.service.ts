import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { isRedisEnabled } from "../scheduling/redis-enabled.helper";
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
// REDIS_ENABLED=false (shared hosting) — enqueueDelivery() jadi no-op,
// NotificationPollService (cron-runner) yang memproses baris QUEUED
// langsung dari DB (subject/body sudah dipersist NotificationService.enqueue(),
// lihat banner comment NotificationLog schema.prisma).
@Injectable()
export class NotificationQueueService implements OnModuleDestroy {
  private readonly connection: Redis | null;
  private readonly queue: Queue<NotificationDeliveryJobPayload> | null;

  constructor() {
    if (!isRedisEnabled()) {
      this.connection = null;
      this.queue = null;
      return;
    }
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
    if (!this.queue) return;
    await this.queue.add(NOTIFICATION_DELIVERY_JOB_NAME, payload, {
      attempts: NOTIFICATION_MAX_ATTEMPTS,
      backoff: { type: "exponential", delay: NOTIFICATION_BACKOFF_BASE_DELAY_MS },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.queue || !this.connection) return;
    await this.queue.close();
    await this.connection.quit();
  }
}
