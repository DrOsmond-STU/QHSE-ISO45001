import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import {
  INSPECTION_RECORD_GENERATION_SCAN_CRON,
  INSPECTION_RECORD_GENERATION_SCAN_JOB_NAME,
  INSPECTION_RECORD_GENERATION_SCAN_QUEUE,
} from "./inspection-record-generation-scan.constants";

@Injectable()
export class InspectionRecordGenerationScanQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(InspectionRecordGenerationScanQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue;

  constructor() {
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(INSPECTION_RECORD_GENERATION_SCAN_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.add(
      INSPECTION_RECORD_GENERATION_SCAN_JOB_NAME,
      {},
      {
        repeat: { pattern: INSPECTION_RECORD_GENERATION_SCAN_CRON },
        jobId: INSPECTION_RECORD_GENERATION_SCAN_JOB_NAME,
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Repeatable job "${INSPECTION_RECORD_GENERATION_SCAN_QUEUE}" terdaftar (cron: ${INSPECTION_RECORD_GENERATION_SCAN_CRON}).`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
