import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import {
  WASTE_STORAGE_DURATION_SCAN_CRON,
  WASTE_STORAGE_DURATION_SCAN_JOB_NAME,
  WASTE_STORAGE_DURATION_SCAN_QUEUE,
} from "./waste-storage-duration-scan.constants";

@Injectable()
export class WasteStorageDurationScanQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(WasteStorageDurationScanQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue;

  constructor() {
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(WASTE_STORAGE_DURATION_SCAN_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.add(
      WASTE_STORAGE_DURATION_SCAN_JOB_NAME,
      {},
      {
        repeat: { pattern: WASTE_STORAGE_DURATION_SCAN_CRON },
        jobId: WASTE_STORAGE_DURATION_SCAN_JOB_NAME,
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Repeatable job "${WASTE_STORAGE_DURATION_SCAN_QUEUE}" terdaftar (cron: ${WASTE_STORAGE_DURATION_SCAN_CRON}).`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
