import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import {
  AUDITOR_COMPETENCY_EXPIRY_SCAN_CRON,
  AUDITOR_COMPETENCY_EXPIRY_SCAN_JOB_NAME,
  AUDITOR_COMPETENCY_EXPIRY_SCAN_QUEUE,
} from "./auditor-competency-expiry-scan.constants";

@Injectable()
export class AuditorCompetencyExpiryScanQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(AuditorCompetencyExpiryScanQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue;

  constructor() {
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(AUDITOR_COMPETENCY_EXPIRY_SCAN_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.add(
      AUDITOR_COMPETENCY_EXPIRY_SCAN_JOB_NAME,
      {},
      {
        repeat: { pattern: AUDITOR_COMPETENCY_EXPIRY_SCAN_CRON },
        jobId: AUDITOR_COMPETENCY_EXPIRY_SCAN_JOB_NAME,
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Repeatable job "${AUDITOR_COMPETENCY_EXPIRY_SCAN_QUEUE}" terdaftar (cron: ${AUDITOR_COMPETENCY_EXPIRY_SCAN_CRON}).`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
