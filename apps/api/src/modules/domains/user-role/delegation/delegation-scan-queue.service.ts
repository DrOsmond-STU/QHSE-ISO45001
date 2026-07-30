import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { DELEGATION_SCAN_CRON, DELEGATION_SCAN_JOB_NAME, DELEGATION_SCAN_QUEUE } from "./delegation-scan.constants";

// Sisi producer BullMQ (TDD §13.1), pola sama ReminderScanQueueService (1.1) /
// WorkflowSlaQueueService (0.9) — koneksi ioredis SENDIRI
// (maxRetriesPerRequest:null), cron pattern (bukan interval).
@Injectable()
export class DelegationScanQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(DelegationScanQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue;

  constructor() {
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(DELEGATION_SCAN_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.add(
      DELEGATION_SCAN_JOB_NAME,
      {},
      {
        repeat: { pattern: DELEGATION_SCAN_CRON },
        jobId: DELEGATION_SCAN_JOB_NAME,
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Repeatable job "${DELEGATION_SCAN_QUEUE}" terdaftar (cron: ${DELEGATION_SCAN_CRON}).`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
