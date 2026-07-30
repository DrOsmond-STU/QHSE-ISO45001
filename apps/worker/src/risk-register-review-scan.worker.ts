import { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Job, Worker } from "bullmq";
import Redis from "ioredis";
import { HiraJsaHiradcWorkerModule } from "@qhse/api/dist/modules/domains/risk-management/hira-jsa-hiradc/hira-jsa-hiradc-worker.module";
import { RiskRegisterReviewScanService } from "@qhse/api/dist/modules/domains/risk-management/hira-jsa-hiradc/risk-register-review-scan.service";
import { RISK_REGISTER_REVIEW_SCAN_QUEUE } from "@qhse/api/dist/modules/domains/risk-management/hira-jsa-hiradc/risk-register-review-scan.constants";

export interface RiskRegisterReviewScanWorkerHandle {
  appContext: INestApplicationContext;
  worker: Worker;
}

export async function bootstrapRiskRegisterReviewScanWorker(): Promise<RiskRegisterReviewScanWorkerHandle> {
  const appContext = await NestFactory.createApplicationContext(HiraJsaHiradcWorkerModule, { logger: ["log", "warn", "error"] });
  const scanService = appContext.get(RiskRegisterReviewScanService);

  const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });

  const worker = new Worker(
    RISK_REGISTER_REVIEW_SCAN_QUEUE,
    async (_job: Job) => {
      await scanService.scan();
    },
    { connection, concurrency: 1 },
  );

  worker.on("completed", () => {
    // eslint-disable-next-line no-console
    console.log(`[qhse-worker] ${RISK_REGISTER_REVIEW_SCAN_QUEUE} selesai.`);
  });
  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({ level: "error", queue: RISK_REGISTER_REVIEW_SCAN_QUEUE, jobId: job?.id, attemptsMade: job?.attemptsMade, error: err instanceof Error ? err.message : String(err) }),
    );
  });

  return { appContext, worker };
}
