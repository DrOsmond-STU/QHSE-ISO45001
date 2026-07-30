import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { CALIBRATION_DUE_SCAN_CRON, CALIBRATION_DUE_SCAN_JOB_NAME, CALIBRATION_DUE_SCAN_QUEUE } from "./calibration-due-scan.constants";

@Injectable()
export class CalibrationDueScanQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(CalibrationDueScanQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue;

  constructor() {
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(CALIBRATION_DUE_SCAN_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.add(
      CALIBRATION_DUE_SCAN_JOB_NAME,
      {},
      {
        repeat: { pattern: CALIBRATION_DUE_SCAN_CRON },
        jobId: CALIBRATION_DUE_SCAN_JOB_NAME,
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Repeatable job "${CALIBRATION_DUE_SCAN_QUEUE}" terdaftar (cron: ${CALIBRATION_DUE_SCAN_CRON}).`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
