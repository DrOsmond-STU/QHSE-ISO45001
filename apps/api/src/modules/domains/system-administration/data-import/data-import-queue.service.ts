import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { DataImportJobPayload } from "./data-import-job.types";
import {
  DATA_IMPORT_COMMIT_JOB_NAME,
  DATA_IMPORT_COMMIT_MAX_ATTEMPTS,
  DATA_IMPORT_QUEUE,
  DATA_IMPORT_VALIDATE_JOB_NAME,
  DATA_IMPORT_VALIDATE_MAX_ATTEMPTS,
} from "./data-import.constants";

// Sisi producer BullMQ (TDD §13.1), pola sama persis
// attachment-queue.service.ts (0.12): koneksi ioredis SENDIRI, BullMQ
// WAJIB maxRetriesPerRequest:null.
@Injectable()
export class DataImportQueueService implements OnModuleDestroy {
  private readonly connection: Redis;
  private readonly queue: Queue<DataImportJobPayload>;

  constructor() {
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(DATA_IMPORT_QUEUE, { connection: this.connection });
  }

  /**
   * attempts tinggi + backoff exponential — dipakai jadi mekanisme
   * tunggu-hasil-scan-malware (lihat data-import.constants.ts banner
   * comment), BUKAN cuma toleransi error transient biasa.
   */
  async enqueueValidate(payload: DataImportJobPayload): Promise<void> {
    await this.queue.add(DATA_IMPORT_VALIDATE_JOB_NAME, payload, {
      attempts: DATA_IMPORT_VALIDATE_MAX_ATTEMPTS,
      backoff: { type: "exponential", delay: 3000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async enqueueCommit(payload: DataImportJobPayload): Promise<void> {
    await this.queue.add(DATA_IMPORT_COMMIT_JOB_NAME, payload, {
      attempts: DATA_IMPORT_COMMIT_MAX_ATTEMPTS,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
