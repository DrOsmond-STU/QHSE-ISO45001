import { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Job, Worker } from "bullmq";
import Redis from "ioredis";
// Deep import ke dist compiled @qhse/api — pola sama worker lain (0.9/1.1/1.4/1.5).
import { DmsWorkerModule } from "@qhse/api/dist/modules/domains/dms/dms-worker.module";
import { DocumentReviewScanService } from "@qhse/api/dist/modules/domains/dms/document-review-scan.service";
import { DOCUMENT_REVIEW_SCAN_QUEUE } from "@qhse/api/dist/modules/domains/dms/document-review-scan.constants";

export interface DocumentReviewScanWorkerHandle {
  appContext: INestApplicationContext;
  worker: Worker;
}

/**
 * TDD §13.1 — konsumen BullMQ document-review-scan. Pola persis
 * bootstrapReminderScanWorker (1.1)/bootstrapUsageCounterScanWorker (1.5).
 */
export async function bootstrapDocumentReviewScanWorker(): Promise<DocumentReviewScanWorkerHandle> {
  const appContext = await NestFactory.createApplicationContext(DmsWorkerModule, {
    logger: ["log", "warn", "error"],
  });
  const scanService = appContext.get(DocumentReviewScanService);

  const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });

  const worker = new Worker(
    DOCUMENT_REVIEW_SCAN_QUEUE,
    async (_job: Job) => {
      await scanService.scan();
    },
    { connection, concurrency: 1 },
  );

  worker.on("completed", () => {
    // eslint-disable-next-line no-console
    console.log(`[qhse-worker] ${DOCUMENT_REVIEW_SCAN_QUEUE} selesai.`);
  });
  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        queue: DOCUMENT_REVIEW_SCAN_QUEUE,
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  });

  return { appContext, worker };
}
