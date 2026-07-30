import { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Job, Worker } from "bullmq";
import Redis from "ioredis";
// Deep import ke dist compiled @qhse/api — pola sama worker lain.
import { QualityWorkerModule } from "@qhse/api/dist/modules/domains/quality/quality-worker.module";
import { QualityComplaintResponseSlaScanService } from "@qhse/api/dist/modules/domains/quality/quality-complaint-response-sla-scan.service";
import { QUALITY_COMPLAINT_RESPONSE_SLA_SCAN_QUEUE } from "@qhse/api/dist/modules/domains/quality/quality-complaint-response-sla-scan.constants";

export interface QualityComplaintResponseSlaScanWorkerHandle {
  appContext: INestApplicationContext;
  worker: Worker;
}

export async function bootstrapQualityComplaintResponseSlaScanWorker(): Promise<QualityComplaintResponseSlaScanWorkerHandle> {
  const appContext = await NestFactory.createApplicationContext(QualityWorkerModule, { logger: ["log", "warn", "error"] });
  const scanService = appContext.get(QualityComplaintResponseSlaScanService);

  const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });

  const worker = new Worker(
    QUALITY_COMPLAINT_RESPONSE_SLA_SCAN_QUEUE,
    async (_job: Job) => {
      await scanService.scan();
    },
    { connection, concurrency: 1 },
  );

  worker.on("completed", () => {
    // eslint-disable-next-line no-console
    console.log(`[qhse-worker] ${QUALITY_COMPLAINT_RESPONSE_SLA_SCAN_QUEUE} selesai.`);
  });
  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        queue: QUALITY_COMPLAINT_RESPONSE_SLA_SCAN_QUEUE,
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  });

  return { appContext, worker };
}
