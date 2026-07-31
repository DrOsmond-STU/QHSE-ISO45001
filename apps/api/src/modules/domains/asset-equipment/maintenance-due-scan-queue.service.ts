import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { isRedisEnabled } from "../../../platform/scheduling/redis-enabled.helper";
import { MAINTENANCE_DUE_SCAN_CRON, MAINTENANCE_DUE_SCAN_JOB_NAME, MAINTENANCE_DUE_SCAN_QUEUE } from "./maintenance-due-scan.constants";

// REDIS_ENABLED=false (shared hosting cPanel, TDD deployment-adaptation) —
// pemicu jadwal pindah ke CronRunnerController (platform/cron-runner/),
// dipanggil cPanel Cron Job, BUKAN BullMQ repeatable job. Class ini jadi
// no-op total supaya tidak mencoba connect Redis yang tidak ada (queue.add()
// dgn maxRetriesPerRequest:null akan HANG selamanya kalau dibiarkan jalan,
// memblokir onApplicationBootstrap seluruh app).
@Injectable()
export class MaintenanceDueScanQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(MaintenanceDueScanQueueService.name);
  private readonly connection: Redis | null;
  private readonly queue: Queue | null;

  constructor() {
    if (!isRedisEnabled()) {
      this.connection = null;
      this.queue = null;
      return;
    }
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(MAINTENANCE_DUE_SCAN_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.queue) return;
    await this.queue.add(
      MAINTENANCE_DUE_SCAN_JOB_NAME,
      {},
      {
        repeat: { pattern: MAINTENANCE_DUE_SCAN_CRON },
        jobId: MAINTENANCE_DUE_SCAN_JOB_NAME,
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Repeatable job "${MAINTENANCE_DUE_SCAN_QUEUE}" terdaftar (cron: ${MAINTENANCE_DUE_SCAN_CRON}).`);
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.queue || !this.connection) return;
    await this.queue.close();
    await this.connection.quit();
  }
}
