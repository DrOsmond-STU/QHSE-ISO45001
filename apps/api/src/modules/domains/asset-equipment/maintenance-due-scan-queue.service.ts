import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { MAINTENANCE_DUE_SCAN_CRON, MAINTENANCE_DUE_SCAN_JOB_NAME, MAINTENANCE_DUE_SCAN_QUEUE } from "./maintenance-due-scan.constants";

@Injectable()
export class MaintenanceDueScanQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(MaintenanceDueScanQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue;

  constructor() {
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(MAINTENANCE_DUE_SCAN_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.add(
      MAINTENANCE_DUE_SCAN_JOB_NAME,
      {},
      {
        repeat: { pattern: MAINTENANCE_DUE_SCAN_CRON },
        jobId: MAINTENANCE_DUE_SCAN_JOB_NAME,
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Repeatable job "${MAINTENANCE_DUE_SCAN_QUEUE}" terdaftar (cron: ${MAINTENANCE_DUE_SCAN_CRON}).`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
