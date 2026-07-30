import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { CONTRACTOR_DUE_SCAN_CRON, CONTRACTOR_DUE_SCAN_JOB_NAME, CONTRACTOR_DUE_SCAN_QUEUE } from "./contractor-due-scan.constants";

@Injectable()
export class ContractorDueScanQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ContractorDueScanQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue;

  constructor() {
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(CONTRACTOR_DUE_SCAN_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.add(
      CONTRACTOR_DUE_SCAN_JOB_NAME,
      {},
      {
        repeat: { pattern: CONTRACTOR_DUE_SCAN_CRON },
        jobId: CONTRACTOR_DUE_SCAN_JOB_NAME,
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Repeatable job "${CONTRACTOR_DUE_SCAN_QUEUE}" terdaftar (cron: ${CONTRACTOR_DUE_SCAN_CRON}).`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
