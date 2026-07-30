import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import {
  USAGE_COUNTER_SCAN_CRON,
  USAGE_COUNTER_SCAN_JOB_NAME,
  USAGE_COUNTER_SCAN_QUEUE,
} from "./usage-counter-scan.constants";

// Sisi producer BullMQ (TDD §13.1), pola sama ReminderScanQueueService (1.1)/
// DelegationScanQueueService (1.4).
@Injectable()
export class UsageCounterScanQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(UsageCounterScanQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue;

  constructor() {
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(USAGE_COUNTER_SCAN_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.add(
      USAGE_COUNTER_SCAN_JOB_NAME,
      {},
      {
        repeat: { pattern: USAGE_COUNTER_SCAN_CRON },
        jobId: USAGE_COUNTER_SCAN_JOB_NAME,
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Repeatable job "${USAGE_COUNTER_SCAN_QUEUE}" terdaftar (cron: ${USAGE_COUNTER_SCAN_CRON}).`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
