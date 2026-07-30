import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import {
  QUALITY_COMPLAINT_RESPONSE_SLA_SCAN_CRON,
  QUALITY_COMPLAINT_RESPONSE_SLA_SCAN_JOB_NAME,
  QUALITY_COMPLAINT_RESPONSE_SLA_SCAN_QUEUE,
} from "./quality-complaint-response-sla-scan.constants";

@Injectable()
export class QualityComplaintResponseSlaScanQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(QualityComplaintResponseSlaScanQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue;

  constructor() {
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(QUALITY_COMPLAINT_RESPONSE_SLA_SCAN_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.add(
      QUALITY_COMPLAINT_RESPONSE_SLA_SCAN_JOB_NAME,
      {},
      {
        repeat: { pattern: QUALITY_COMPLAINT_RESPONSE_SLA_SCAN_CRON },
        jobId: QUALITY_COMPLAINT_RESPONSE_SLA_SCAN_JOB_NAME,
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Repeatable job "${QUALITY_COMPLAINT_RESPONSE_SLA_SCAN_QUEUE}" terdaftar (cron: ${QUALITY_COMPLAINT_RESPONSE_SLA_SCAN_CRON}).`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
