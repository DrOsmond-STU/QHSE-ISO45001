import { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Job, Worker } from "bullmq";
import Redis from "ioredis";
import { HiraJsaHiradcWorkerModule } from "@qhse/api/dist/modules/domains/risk-management/hira-jsa-hiradc/hira-jsa-hiradc-worker.module";
import { HiraReviewDueScanService } from "@qhse/api/dist/modules/domains/risk-management/hira-jsa-hiradc/hira-review-due-scan.service";
import { HIRA_REVIEW_DUE_SCAN_QUEUE } from "@qhse/api/dist/modules/domains/risk-management/hira-jsa-hiradc/hira-review-due-scan.constants";

export interface HiraReviewDueScanWorkerHandle {
  appContext: INestApplicationContext;
  worker: Worker;
}

export async function bootstrapHiraReviewDueScanWorker(): Promise<HiraReviewDueScanWorkerHandle> {
  const appContext = await NestFactory.createApplicationContext(HiraJsaHiradcWorkerModule, { logger: ["log", "warn", "error"] });
  const scanService = appContext.get(HiraReviewDueScanService);

  const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });

  const worker = new Worker(
    HIRA_REVIEW_DUE_SCAN_QUEUE,
    async (_job: Job) => {
      await scanService.scan();
    },
    { connection, concurrency: 1 },
  );

  worker.on("completed", () => {
    // eslint-disable-next-line no-console
    console.log(`[qhse-worker] ${HIRA_REVIEW_DUE_SCAN_QUEUE} selesai.`);
  });
  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({ level: "error", queue: HIRA_REVIEW_DUE_SCAN_QUEUE, jobId: job?.id, attemptsMade: job?.attemptsMade, error: err instanceof Error ? err.message : String(err) }),
    );
  });

  return { appContext, worker };
}
