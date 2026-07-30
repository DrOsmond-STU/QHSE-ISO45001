import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import {
  AUDIT_FINDING_CLOSURE_DUE_SCAN_CRON,
  AUDIT_FINDING_CLOSURE_DUE_SCAN_JOB_NAME,
  AUDIT_FINDING_CLOSURE_DUE_SCAN_QUEUE,
} from "./audit-finding-closure-due-scan.constants";

@Injectable()
export class AuditFindingClosureDueScanQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(AuditFindingClosureDueScanQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue;

  constructor() {
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(AUDIT_FINDING_CLOSURE_DUE_SCAN_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.add(
      AUDIT_FINDING_CLOSURE_DUE_SCAN_JOB_NAME,
      {},
      {
        repeat: { pattern: AUDIT_FINDING_CLOSURE_DUE_SCAN_CRON },
        jobId: AUDIT_FINDING_CLOSURE_DUE_SCAN_JOB_NAME,
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Repeatable job "${AUDIT_FINDING_CLOSURE_DUE_SCAN_QUEUE}" terdaftar (cron: ${AUDIT_FINDING_CLOSURE_DUE_SCAN_CRON}).`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
