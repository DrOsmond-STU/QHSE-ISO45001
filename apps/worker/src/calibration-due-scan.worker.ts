import { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Job, Worker } from "bullmq";
import Redis from "ioredis";
// Deep import ke dist compiled @qhse/api — pola sama worker lain.
import { CalibrationWorkerModule } from "@qhse/api/dist/modules/domains/calibration/calibration-worker.module";
import { CalibrationDueScanService } from "@qhse/api/dist/modules/domains/calibration/calibration-due-scan.service";
import { CALIBRATION_DUE_SCAN_QUEUE } from "@qhse/api/dist/modules/domains/calibration/calibration-due-scan.constants";

export interface CalibrationDueScanWorkerHandle {
  appContext: INestApplicationContext;
  worker: Worker;
}

export async function bootstrapCalibrationDueScanWorker(): Promise<CalibrationDueScanWorkerHandle> {
  const appContext = await NestFactory.createApplicationContext(CalibrationWorkerModule, { logger: ["log", "warn", "error"] });
  const scanService = appContext.get(CalibrationDueScanService);

  const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });

  const worker = new Worker(
    CALIBRATION_DUE_SCAN_QUEUE,
    async (_job: Job) => {
      await scanService.scan();
    },
    { connection, concurrency: 1 },
  );

  worker.on("completed", () => {
    // eslint-disable-next-line no-console
    console.log(`[qhse-worker] ${CALIBRATION_DUE_SCAN_QUEUE} selesai.`);
  });
  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        queue: CALIBRATION_DUE_SCAN_QUEUE,
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  });

  return { appContext, worker };
}
