import { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Job, Worker } from "bullmq";
import Redis from "ioredis";
// Deep import ke dist compiled @qhse/api — pola sama worker lain.
import { HiraJsaHiradcWorkerModule } from "@qhse/api/dist/modules/domains/risk-management/hira-jsa-hiradc/hira-jsa-hiradc-worker.module";
import { HiradcExpiryScanService } from "@qhse/api/dist/modules/domains/risk-management/hira-jsa-hiradc/hiradc-expiry-scan.service";
import { HIRADC_EXPIRY_SCAN_QUEUE } from "@qhse/api/dist/modules/domains/risk-management/hira-jsa-hiradc/hiradc-expiry-scan.constants";

export interface HiradcExpiryScanWorkerHandle {
  appContext: INestApplicationContext;
  worker: Worker;
}

export async function bootstrapHiradcExpiryScanWorker(): Promise<HiradcExpiryScanWorkerHandle> {
  const appContext = await NestFactory.createApplicationContext(HiraJsaHiradcWorkerModule, { logger: ["log", "warn", "error"] });
  const scanService = appContext.get(HiradcExpiryScanService);

  const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });

  const worker = new Worker(
    HIRADC_EXPIRY_SCAN_QUEUE,
    async (_job: Job) => {
      await scanService.scan();
    },
    { connection, concurrency: 1 },
  );

  worker.on("completed", () => {
    // eslint-disable-next-line no-console
    console.log(`[qhse-worker] ${HIRADC_EXPIRY_SCAN_QUEUE} selesai.`);
  });
  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({ level: "error", queue: HIRADC_EXPIRY_SCAN_QUEUE, jobId: job?.id, attemptsMade: job?.attemptsMade, error: err instanceof Error ? err.message : String(err) }),
    );
  });

  return { appContext, worker };
}
