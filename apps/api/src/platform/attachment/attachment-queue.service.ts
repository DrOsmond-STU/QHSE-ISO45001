import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { AttachmentScanJobPayload } from "./attachment-scan-job.types";
import { ATTACHMENT_SCAN_JOB_NAME, ATTACHMENT_SCAN_MAX_ATTEMPTS, ATTACHMENT_SCAN_QUEUE } from "./attachment.constants";

// Sisi producer BullMQ (TDD §13.1), pola sama persis
// notification-queue.service.ts (task 0.11) / workflow-sla-queue.service.ts
// (task 0.9): koneksi ioredis SENDIRI, BullMQ WAJIB maxRetriesPerRequest:null.
@Injectable()
export class AttachmentQueueService implements OnModuleDestroy {
  private readonly connection: Redis;
  private readonly queue: Queue<AttachmentScanJobPayload>;

  constructor() {
    this.connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    this.queue = new Queue(ATTACHMENT_SCAN_QUEUE, { connection: this.connection });
  }

  async enqueueScan(payload: AttachmentScanJobPayload): Promise<void> {
    await this.queue.add(ATTACHMENT_SCAN_JOB_NAME, payload, {
      attempts: ATTACHMENT_SCAN_MAX_ATTEMPTS,
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
