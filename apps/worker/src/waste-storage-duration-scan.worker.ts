import { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Job, Worker } from "bullmq";
import Redis from "ioredis";
// Deep import ke dist compiled @qhse/api — pola sama worker lain.
import { EnvironmentalWorkerModule } from "@qhse/api/dist/modules/domains/environmental/environmental-worker.module";
import { WasteStorageDurationScanService } from "@qhse/api/dist/modules/domains/environmental/waste-storage-duration-scan.service";
import { WASTE_STORAGE_DURATION_SCAN_QUEUE } from "@qhse/api/dist/modules/domains/environmental/waste-storage-duration-scan.constants";

export interface WasteStorageDurationScanWorkerHandle {
  appContext: INestApplicationContext;
  worker: Worker;
}

export async function bootstrapWasteStorageDurationScanWorker(): Promise<WasteStorageDurationScanWorkerHandle> {
  const appContext = await NestFactory.createApplicationContext(EnvironmentalWorkerModule, { logger: ["log", "warn", "error"] });
  const scanService = appContext.get(WasteStorageDurationScanService);

  const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });

  const worker = new Worker(
    WASTE_STORAGE_DURATION_SCAN_QUEUE,
    async (_job: Job) => {
      await scanService.scan();
    },
    { connection, concurrency: 1 },
  );

  worker.on("completed", () => {
    // eslint-disable-next-line no-console
    console.log(`[qhse-worker] ${WASTE_STORAGE_DURATION_SCAN_QUEUE} selesai.`);
  });
  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        queue: WASTE_STORAGE_DURATION_SCAN_QUEUE,
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  });

  return { appContext, worker };
}
