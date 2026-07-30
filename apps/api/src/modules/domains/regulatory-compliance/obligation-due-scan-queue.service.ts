import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { OBLIGATION_DUE_SCAN_CRON, OBLIGATION_DUE_SCAN_JOB_NAME, OBLIGATION_DUE_SCAN_QUEUE } from "./obligation-due-scan.constants";

// Sisi producer BullMQ (TDD §13.1), pola sama DocumentReviewScanQueueService (2.1).
@Injectable()
export class ObligationDueScanQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ObligationDueScanQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue;

  constructor() {
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(OBLIGATION_DUE_SCAN_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.add(
      OBLIGATION_DUE_SCAN_JOB_NAME,
      {},
      {
        repeat: { pattern: OBLIGATION_DUE_SCAN_CRON },
        jobId: OBLIGATION_DUE_SCAN_JOB_NAME,
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Repeatable job "${OBLIGATION_DUE_SCAN_QUEUE}" terdaftar (cron: ${OBLIGATION_DUE_SCAN_CRON}).`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
