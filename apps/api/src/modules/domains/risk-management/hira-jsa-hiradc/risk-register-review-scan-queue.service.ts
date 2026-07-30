import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import {
  RISK_REGISTER_REVIEW_SCAN_CRON,
  RISK_REGISTER_REVIEW_SCAN_JOB_NAME,
  RISK_REGISTER_REVIEW_SCAN_QUEUE,
} from "./risk-register-review-scan.constants";

@Injectable()
export class RiskRegisterReviewScanQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(RiskRegisterReviewScanQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue;

  constructor() {
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(RISK_REGISTER_REVIEW_SCAN_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.add(
      RISK_REGISTER_REVIEW_SCAN_JOB_NAME,
      {},
      { repeat: { pattern: RISK_REGISTER_REVIEW_SCAN_CRON }, jobId: RISK_REGISTER_REVIEW_SCAN_JOB_NAME, removeOnComplete: true, removeOnFail: 50 },
    );
    this.logger.log(`Repeatable job "${RISK_REGISTER_REVIEW_SCAN_QUEUE}" terdaftar (cron: ${RISK_REGISTER_REVIEW_SCAN_CRON}).`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
