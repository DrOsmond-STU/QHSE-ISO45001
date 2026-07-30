import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { WORK_PERMIT_EXPIRY_SCAN_CRON, WORK_PERMIT_EXPIRY_SCAN_JOB_NAME, WORK_PERMIT_EXPIRY_SCAN_QUEUE } from "./work-permit-expiry-scan.constants";

@Injectable()
export class WorkPermitExpiryScanQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(WorkPermitExpiryScanQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue;

  constructor() {
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(WORK_PERMIT_EXPIRY_SCAN_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.add(
      WORK_PERMIT_EXPIRY_SCAN_JOB_NAME,
      {},
      { repeat: { pattern: WORK_PERMIT_EXPIRY_SCAN_CRON }, jobId: WORK_PERMIT_EXPIRY_SCAN_JOB_NAME, removeOnComplete: true, removeOnFail: 50 },
    );
    this.logger.log(`Repeatable job "${WORK_PERMIT_EXPIRY_SCAN_QUEUE}" terdaftar (cron: ${WORK_PERMIT_EXPIRY_SCAN_CRON}).`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
