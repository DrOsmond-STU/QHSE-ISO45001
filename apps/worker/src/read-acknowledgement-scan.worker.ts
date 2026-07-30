import { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Job, Worker } from "bullmq";
import Redis from "ioredis";
// Deep import ke dist compiled @qhse/api — pola sama worker lain (0.9/1.1/1.4/1.5).
import { DmsWorkerModule } from "@qhse/api/dist/modules/domains/dms/dms-worker.module";
import { ReadAcknowledgementScanService } from "@qhse/api/dist/modules/domains/dms/read-acknowledgement-scan.service";
import { READ_ACKNOWLEDGEMENT_SCAN_QUEUE } from "@qhse/api/dist/modules/domains/dms/read-acknowledgement-scan.constants";

export interface ReadAcknowledgementScanWorkerHandle {
  appContext: INestApplicationContext;
  worker: Worker;
}

/**
 * TDD §13.1 — konsumen BullMQ read-acknowledgement-scan. Pola persis
 * bootstrapReminderScanWorker (1.1)/bootstrapUsageCounterScanWorker (1.5).
 */
export async function bootstrapReadAcknowledgementScanWorker(): Promise<ReadAcknowledgementScanWorkerHandle> {
  const appContext = await NestFactory.createApplicationContext(DmsWorkerModule, {
    logger: ["log", "warn", "error"],
  });
  const scanService = appContext.get(ReadAcknowledgementScanService);

  const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });

  const worker = new Worker(
    READ_ACKNOWLEDGEMENT_SCAN_QUEUE,
    async (_job: Job) => {
      await scanService.scan();
    },
    { connection, concurrency: 1 },
  );

  worker.on("completed", () => {
    // eslint-disable-next-line no-console
    console.log(`[qhse-worker] ${READ_ACKNOWLEDGEMENT_SCAN_QUEUE} selesai.`);
  });
  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        queue: READ_ACKNOWLEDGEMENT_SCAN_QUEUE,
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  });

  return { appContext, worker };
}
