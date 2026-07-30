import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import {
  EMERGENCY_PLAN_REVIEW_OVERDUE_SCAN_CRON,
  EMERGENCY_PLAN_REVIEW_OVERDUE_SCAN_JOB_NAME,
  EMERGENCY_PLAN_REVIEW_OVERDUE_SCAN_QUEUE,
} from "./emergency-plan-review-overdue-scan.constants";

@Injectable()
export class EmergencyPlanReviewOverdueScanQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(EmergencyPlanReviewOverdueScanQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue;

  constructor() {
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(EMERGENCY_PLAN_REVIEW_OVERDUE_SCAN_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.add(
      EMERGENCY_PLAN_REVIEW_OVERDUE_SCAN_JOB_NAME,
      {},
      {
        repeat: { pattern: EMERGENCY_PLAN_REVIEW_OVERDUE_SCAN_CRON },
        jobId: EMERGENCY_PLAN_REVIEW_OVERDUE_SCAN_JOB_NAME,
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Repeatable job "${EMERGENCY_PLAN_REVIEW_OVERDUE_SCAN_QUEUE}" terdaftar (cron: ${EMERGENCY_PLAN_REVIEW_OVERDUE_SCAN_CRON}).`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
