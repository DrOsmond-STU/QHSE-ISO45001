import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { GAS_RETEST_DUE_SCAN_CRON, GAS_RETEST_DUE_SCAN_JOB_NAME, GAS_RETEST_DUE_SCAN_QUEUE } from "./gas-retest-due-scan.constants";

@Injectable()
export class GasRetestDueScanQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(GasRetestDueScanQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue;

  constructor() {
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(GAS_RETEST_DUE_SCAN_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.add(
      GAS_RETEST_DUE_SCAN_JOB_NAME,
      {},
      { repeat: { pattern: GAS_RETEST_DUE_SCAN_CRON }, jobId: GAS_RETEST_DUE_SCAN_JOB_NAME, removeOnComplete: true, removeOnFail: 50 },
    );
    this.logger.log(`Repeatable job "${GAS_RETEST_DUE_SCAN_QUEUE}" terdaftar (cron: ${GAS_RETEST_DUE_SCAN_CRON}).`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
