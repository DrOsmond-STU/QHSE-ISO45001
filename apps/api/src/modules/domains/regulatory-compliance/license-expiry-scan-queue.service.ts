import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { LICENSE_EXPIRY_SCAN_CRON, LICENSE_EXPIRY_SCAN_JOB_NAME, LICENSE_EXPIRY_SCAN_QUEUE } from "./license-expiry-scan.constants";

// Sisi producer BullMQ (TDD §13.1), pola sama DocumentReviewScanQueueService (2.1).
@Injectable()
export class LicenseExpiryScanQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(LicenseExpiryScanQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue;

  constructor() {
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(LICENSE_EXPIRY_SCAN_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
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
    await this.queue.close();
    await this.connection.quit();
  }
}
