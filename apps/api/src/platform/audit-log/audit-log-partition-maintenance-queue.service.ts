import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import {
  AUDIT_LOG_PARTITION_MAINTENANCE_CRON,
  AUDIT_LOG_PARTITION_MAINTENANCE_JOB_NAME,
  AUDIT_LOG_PARTITION_MAINTENANCE_QUEUE,
} from "./audit-log.constants";

// Sisi producer BullMQ (TDD §13.1), pola sama WorkflowSlaQueueService (0.9)
// — koneksi ioredis SENDIRI (maxRetriesPerRequest:null, wajib utk BullMQ).
// Pakai `pattern` (cron) bukan `every` (interval milidetik) — job ini WAJIB
// align ke tanggal kalender ("bulan berikutnya", bukan "kira-kira 30 hari
// lagi" yang lama-lama drift dari tanggal 1 sungguhan).
@Injectable()
export class AuditLogPartitionMaintenanceQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(AuditLogPartitionMaintenanceQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue;

  constructor() {
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(AUDIT_LOG_PARTITION_MAINTENANCE_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
    // BullMQ dedupe repeatable job berdasar {name, repeat options, jobId} —
    // aman dipanggil ulang tiap kali app restart (upsert, bukan duplikasi),
    // pola sama WorkflowSlaQueueService.
    await this.queue.add(
      AUDIT_LOG_PARTITION_MAINTENANCE_JOB_NAME,
      {},
      {
        repeat: { pattern: AUDIT_LOG_PARTITION_MAINTENANCE_CRON },
        jobId: AUDIT_LOG_PARTITION_MAINTENANCE_JOB_NAME,
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
    this.logger.log(
      `Repeatable job "${AUDIT_LOG_PARTITION_MAINTENANCE_QUEUE}" terdaftar (cron: ${AUDIT_LOG_PARTITION_MAINTENANCE_CRON}).`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
