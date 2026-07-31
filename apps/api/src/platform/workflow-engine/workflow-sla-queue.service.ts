import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { isRedisEnabled } from "../scheduling/redis-enabled.helper";
import {
  WORKFLOW_SLA_SCAN_INTERVAL_MS,
  WORKFLOW_SLA_SCAN_JOB_NAME,
  WORKFLOW_SLA_SCAN_QUEUE,
} from "./workflow-engine.constants";

// Sisi producer BullMQ (TDD §13.1). Koneksi ioredis SENDIRI (bukan reuse
// auth/redis.provider.ts) — BullMQ WAJIB maxRetriesPerRequest:null utk
// operasi blocking-nya, konflik kalau dicampur trafik cache/session lain
// (pola "satu koneksi per module" yang sama dipakai task 0.8 RBAC).
// REDIS_ENABLED=false (shared hosting cPanel, TDD deployment-adaptation) —
// pemicu jadwal pindah ke CronRunnerController (platform/cron-runner/),
// dipanggil cPanel Cron Job, BUKAN BullMQ repeatable job. Class ini jadi
// no-op total supaya tidak mencoba connect Redis yang tidak ada (queue.add()
// dgn maxRetriesPerRequest:null akan HANG selamanya kalau dibiarkan jalan,
// memblokir onApplicationBootstrap seluruh app).
@Injectable()
export class WorkflowSlaQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowSlaQueueService.name);
  private readonly connection: Redis | null;
  private readonly queue: Queue | null;

  constructor() {
    if (!isRedisEnabled()) {
      this.connection = null;
      this.queue = null;
      return;
    }
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(WORKFLOW_SLA_SCAN_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.queue) return;
    // BullMQ dedupe repeatable job berdasarkan {name, repeat options} — panggil
    // .add() berulang dgn jobId+opsi identik meng-upsert jadwal yang sama,
    // BUKAN menduplikasi. Aman dipanggil tanpa syarat setiap kali app restart.
    await this.queue.add(
      WORKFLOW_SLA_SCAN_JOB_NAME,
      {},
      {
        repeat: { every: WORKFLOW_SLA_SCAN_INTERVAL_MS },
        jobId: WORKFLOW_SLA_SCAN_JOB_NAME,
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Repeatable job "${WORKFLOW_SLA_SCAN_QUEUE}" terdaftar (tiap ${WORKFLOW_SLA_SCAN_INTERVAL_MS}ms).`);
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.queue || !this.connection) return;
    await this.queue.close();
    await this.connection.quit();
  }
}
