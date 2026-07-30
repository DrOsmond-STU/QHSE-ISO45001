import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { REMINDER_SCAN_CRON, REMINDER_SCAN_JOB_NAME, REMINDER_SCAN_QUEUE } from "./reminder-scan.constants";

// Sisi producer BullMQ (TDD §13.1), pola sama WorkflowSlaQueueService (0.9) /
// AuditLogPartitionMaintenanceQueueService (0.13) — koneksi ioredis SENDIRI
// (maxRetriesPerRequest:null), cron pattern (bukan interval) supaya jadwal
// align "sekali sehari" sungguhan, bukan mendekati via interval milidetik.
@Injectable()
export class ReminderScanQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ReminderScanQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue;

  constructor() {
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(REMINDER_SCAN_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.add(
      REMINDER_SCAN_JOB_NAME,
      {},
      {
        repeat: { pattern: REMINDER_SCAN_CRON },
        jobId: REMINDER_SCAN_JOB_NAME,
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Repeatable job "${REMINDER_SCAN_QUEUE}" terdaftar (cron: ${REMINDER_SCAN_CRON}).`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
