import { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Job, Worker } from "bullmq";
import Redis from "ioredis";
// Deep import ke dist compiled @qhse/api — pola sama worker lain.
import { IncidentWorkerModule } from "@qhse/api/dist/modules/domains/incident/incident-worker.module";
import { IncidentStatisticsRecalcScanService } from "@qhse/api/dist/modules/domains/incident/incident-statistics-recalc-scan.service";
import { INCIDENT_STATISTICS_RECALC_SCAN_QUEUE } from "@qhse/api/dist/modules/domains/incident/incident-statistics-recalc-scan.constants";

export interface IncidentStatisticsRecalcScanWorkerHandle {
  appContext: INestApplicationContext;
  worker: Worker;
}

export async function bootstrapIncidentStatisticsRecalcScanWorker(): Promise<IncidentStatisticsRecalcScanWorkerHandle> {
  const appContext = await NestFactory.createApplicationContext(IncidentWorkerModule, { logger: ["log", "warn", "error"] });
  const scanService = appContext.get(IncidentStatisticsRecalcScanService);

  const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });

  const worker = new Worker(
    INCIDENT_STATISTICS_RECALC_SCAN_QUEUE,
    async (_job: Job) => {
      await scanService.scan();
    },
    { connection, concurrency: 1 },
  );

  worker.on("completed", () => {
    // eslint-disable-next-line no-console
    console.log(`[qhse-worker] ${INCIDENT_STATISTICS_RECALC_SCAN_QUEUE} selesai.`);
  });
  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        queue: INCIDENT_STATISTICS_RECALC_SCAN_QUEUE,
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  });

  return { appContext, worker };
}
