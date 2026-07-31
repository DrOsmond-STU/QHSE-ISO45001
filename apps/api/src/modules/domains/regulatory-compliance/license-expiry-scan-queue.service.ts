import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { isRedisEnabled } from "../../../platform/scheduling/redis-enabled.helper";
import { LICENSE_EXPIRY_SCAN_CRON, LICENSE_EXPIRY_SCAN_JOB_NAME, LICENSE_EXPIRY_SCAN_QUEUE } from "./license-expiry-scan.constants";

// Sisi producer BullMQ (TDD §13.1), pola sama DocumentReviewScanQueueService (2.1).
// REDIS_ENABLED=false (shared hosting cPanel, TDD deployment-adaptation) —
// pemicu jadwal pindah ke CronRunnerController (platform/cron-runner/),
// dipanggil cPanel Cron Job, BUKAN BullMQ repeatable job. Class ini jadi
// no-op total supaya tidak mencoba connect Redis yang tidak ada (queue.add()
// dgn maxRetriesPerRequest:null akan HANG selamanya kalau dibiarkan jalan,
// memblokir onApplicationBootstrap seluruh app).
@Injectable()
export class LicenseExpiryScanQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(LicenseExpiryScanQueueService.name);
  private readonly connection: Redis | null;
  private readonly queue: Queue | null;

  constructor() {
    if (!isRedisEnabled()) {
      this.connection = null;
      this.queue = null;
      return;
    }
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(LICENSE_EXPIRY_SCAN_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.queue) return;
    await this.queue.add(
      LICENSE_EXPIRY_SCAN_JOB_NAME,
      {},
      {
        repeat: { pattern: LICENSE_EXPIRY_SCAN_CRON },
        jobId: LICENSE_EXPIRY_SCAN_JOB_NAME,
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Repeatable job "${LICENSE_EXPIRY_SCAN_QUEUE}" terdaftar (cron: ${LICENSE_EXPIRY_SCAN_CRON}).`);
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.queue || !this.connection) return;
    await this.queue.close();
    await this.connection.quit();
  }
}
