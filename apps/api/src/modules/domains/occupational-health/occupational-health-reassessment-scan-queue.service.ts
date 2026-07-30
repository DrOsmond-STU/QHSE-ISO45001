import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { OH_REASSESSMENT_SCAN_CRON, OH_REASSESSMENT_SCAN_JOB_NAME, OH_REASSESSMENT_SCAN_QUEUE } from "./occupational-health-reassessment-scan.constants";

@Injectable()
export class OccupationalHealthReassessmentScanQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(OccupationalHealthReassessmentScanQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue;

  constructor() {
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(OH_REASSESSMENT_SCAN_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.add(
      OH_REASSESSMENT_SCAN_JOB_NAME,
      {},
      {
        repeat: { pattern: OH_REASSESSMENT_SCAN_CRON },
        jobId: OH_REASSESSMENT_SCAN_JOB_NAME,
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Repeatable job "${OH_REASSESSMENT_SCAN_QUEUE}" terdaftar (cron: ${OH_REASSESSMENT_SCAN_CRON}).`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
