import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import {
  READ_ACKNOWLEDGEMENT_SCAN_CRON,
  READ_ACKNOWLEDGEMENT_SCAN_JOB_NAME,
  READ_ACKNOWLEDGEMENT_SCAN_QUEUE,
} from "./read-acknowledgement-scan.constants";

// Sisi producer BullMQ (TDD §13.1), pola sama ReminderScanQueueService (1.1).
@Injectable()
export class ReadAcknowledgementScanQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ReadAcknowledgementScanQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue;

  constructor() {
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(READ_ACKNOWLEDGEMENT_SCAN_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.add(
      READ_ACKNOWLEDGEMENT_SCAN_JOB_NAME,
      {},
      {
        repeat: { pattern: READ_ACKNOWLEDGEMENT_SCAN_CRON },
        jobId: READ_ACKNOWLEDGEMENT_SCAN_JOB_NAME,
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Repeatable job "${READ_ACKNOWLEDGEMENT_SCAN_QUEUE}" terdaftar (cron: ${READ_ACKNOWLEDGEMENT_SCAN_CRON}).`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
