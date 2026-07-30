import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import {
  DOCUMENT_REVIEW_SCAN_CRON,
  DOCUMENT_REVIEW_SCAN_JOB_NAME,
  DOCUMENT_REVIEW_SCAN_QUEUE,
} from "./document-review-scan.constants";

// Sisi producer BullMQ (TDD §13.1), pola sama ReminderScanQueueService (1.1).
@Injectable()
export class DocumentReviewScanQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(DocumentReviewScanQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue;

  constructor() {
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(DOCUMENT_REVIEW_SCAN_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.add(
      DOCUMENT_REVIEW_SCAN_JOB_NAME,
      {},
      {
        repeat: { pattern: DOCUMENT_REVIEW_SCAN_CRON },
        jobId: DOCUMENT_REVIEW_SCAN_JOB_NAME,
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Repeatable job "${DOCUMENT_REVIEW_SCAN_QUEUE}" terdaftar (cron: ${DOCUMENT_REVIEW_SCAN_CRON}).`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
