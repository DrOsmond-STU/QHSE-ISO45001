import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { CAPA_ROOT_CAUSE_SLA_SCAN_CRON, CAPA_ROOT_CAUSE_SLA_SCAN_JOB_NAME, CAPA_ROOT_CAUSE_SLA_SCAN_QUEUE } from "./capa-root-cause-sla-scan.constants";

@Injectable()
export class CapaRootCauseSlaScanQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(CapaRootCauseSlaScanQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue;

  constructor() {
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(CAPA_ROOT_CAUSE_SLA_SCAN_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.add(
      CAPA_ROOT_CAUSE_SLA_SCAN_JOB_NAME,
      {},
      {
        repeat: { pattern: CAPA_ROOT_CAUSE_SLA_SCAN_CRON },
        jobId: CAPA_ROOT_CAUSE_SLA_SCAN_JOB_NAME,
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Repeatable job "${CAPA_ROOT_CAUSE_SLA_SCAN_QUEUE}" terdaftar (cron: ${CAPA_ROOT_CAUSE_SLA_SCAN_CRON}).`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
