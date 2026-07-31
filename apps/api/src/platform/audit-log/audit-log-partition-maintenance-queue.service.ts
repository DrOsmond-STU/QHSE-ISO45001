import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { isRedisEnabled } from "../scheduling/redis-enabled.helper";
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
// REDIS_ENABLED=false (shared hosting cPanel, TDD deployment-adaptation) —
// pemicu jadwal pindah ke CronRunnerController (platform/cron-runner/),
// dipanggil cPanel Cron Job, BUKAN BullMQ repeatable job. Class ini jadi
// no-op total supaya tidak mencoba connect Redis yang tidak ada (queue.add()
// dgn maxRetriesPerRequest:null akan HANG selamanya kalau dibiarkan jalan,
// memblokir onApplicationBootstrap seluruh app).
@Injectable()
export class AuditLogPartitionMaintenanceQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(AuditLogPartitionMaintenanceQueueService.name);
  private readonly connection: Redis | null;
  private readonly queue: Queue | null;

  constructor() {
    if (!isRedisEnabled()) {
      this.connection = null;
      this.queue = null;
      return;
    }
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(AUDIT_LOG_PARTITION_MAINTENANCE_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.queue) return;
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
    if (!this.queue || !this.connection) return;
    await this.queue.close();
    await this.connection.quit();
  }
}
