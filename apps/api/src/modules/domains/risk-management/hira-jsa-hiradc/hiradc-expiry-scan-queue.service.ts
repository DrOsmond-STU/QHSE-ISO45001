import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { HIRADC_EXPIRY_SCAN_CRON, HIRADC_EXPIRY_SCAN_JOB_NAME, HIRADC_EXPIRY_SCAN_QUEUE } from "./hiradc-expiry-scan.constants";

@Injectable()
export class HiradcExpiryScanQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(HiradcExpiryScanQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue;

  constructor() {
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(HIRADC_EXPIRY_SCAN_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.add(
      HIRADC_EXPIRY_SCAN_JOB_NAME,
      {},
      { repeat: { pattern: HIRADC_EXPIRY_SCAN_CRON }, jobId: HIRADC_EXPIRY_SCAN_JOB_NAME, removeOnComplete: true, removeOnFail: 50 },
    );
    this.logger.log(`Repeatable job "${HIRADC_EXPIRY_SCAN_QUEUE}" terdaftar (cron: ${HIRADC_EXPIRY_SCAN_CRON}).`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
