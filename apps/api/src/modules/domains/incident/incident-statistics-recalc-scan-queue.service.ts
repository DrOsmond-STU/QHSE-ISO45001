import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import {
  INCIDENT_STATISTICS_RECALC_SCAN_CRON,
  INCIDENT_STATISTICS_RECALC_SCAN_JOB_NAME,
  INCIDENT_STATISTICS_RECALC_SCAN_QUEUE,
} from "./incident-statistics-recalc-scan.constants";

@Injectable()
export class IncidentStatisticsRecalcScanQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(IncidentStatisticsRecalcScanQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue;

  constructor() {
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(INCIDENT_STATISTICS_RECALC_SCAN_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.add(
      INCIDENT_STATISTICS_RECALC_SCAN_JOB_NAME,
      {},
      {
        repeat: { pattern: INCIDENT_STATISTICS_RECALC_SCAN_CRON },
        jobId: INCIDENT_STATISTICS_RECALC_SCAN_JOB_NAME,
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Repeatable job "${INCIDENT_STATISTICS_RECALC_SCAN_QUEUE}" terdaftar (cron: ${INCIDENT_STATISTICS_RECALC_SCAN_CRON}).`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
