import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import {
  WORKFLOW_SLA_SCAN_INTERVAL_MS,
  WORKFLOW_SLA_SCAN_JOB_NAME,
  WORKFLOW_SLA_SCAN_QUEUE,
} from "./workflow-engine.constants";

// Sisi producer BullMQ (TDD §13.1). Koneksi ioredis SENDIRI (bukan reuse
// auth/redis.provider.ts) — BullMQ WAJIB maxRetriesPerRequest:null utk
// operasi blocking-nya, konflik kalau dicampur trafik cache/session lain
// (pola "satu koneksi per module" yang sama dipakai task 0.8 RBAC).
@Injectable()
export class WorkflowSlaQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowSlaQueueService.name);
  private readonly connection: Redis;
  private readonly queue: Queue;

  constructor() {
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(WORKFLOW_SLA_SCAN_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
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
    await this.queue.close();
    await this.connection.quit();
  }
}
