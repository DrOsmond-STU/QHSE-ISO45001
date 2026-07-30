import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import {
  CAPA_EFFECTIVENESS_VERIFICATION_DUE_SCAN_CRON,
  CAPA_EFFECTIVENESS_VERIFICATION_DUE_SCAN_JOB_NAME,
  CAPA_EFFECTIVENESS_VERIFICATION_DUE_SCAN_QUEUE,
} from "./capa-effectiveness-verification-due-scan.constants";

@Injectable()
export class CapaEffectivenessVerificationDueScanQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(CapaEffectivenessVerificationDueScanQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue;

  constructor() {
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(CAPA_EFFECTIVENESS_VERIFICATION_DUE_SCAN_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.add(
      CAPA_EFFECTIVENESS_VERIFICATION_DUE_SCAN_JOB_NAME,
      {},
      {
        repeat: { pattern: CAPA_EFFECTIVENESS_VERIFICATION_DUE_SCAN_CRON },
        jobId: CAPA_EFFECTIVENESS_VERIFICATION_DUE_SCAN_JOB_NAME,
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
    this.logger.log(
      `Repeatable job "${CAPA_EFFECTIVENESS_VERIFICATION_DUE_SCAN_QUEUE}" terdaftar (cron: ${CAPA_EFFECTIVENESS_VERIFICATION_DUE_SCAN_CRON}).`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
