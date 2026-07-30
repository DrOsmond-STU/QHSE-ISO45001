import { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Job, Worker } from "bullmq";
import Redis from "ioredis";
// Deep import ke dist compiled @qhse/api — pola sama worker lain.
import { EmergencyResponseWorkerModule } from "@qhse/api/dist/modules/domains/emergency-response/emergency-response-worker.module";
import { EmergencyPlanReviewOverdueScanService } from "@qhse/api/dist/modules/domains/emergency-response/emergency-plan-review-overdue-scan.service";
import { EMERGENCY_PLAN_REVIEW_OVERDUE_SCAN_QUEUE } from "@qhse/api/dist/modules/domains/emergency-response/emergency-plan-review-overdue-scan.constants";

export interface EmergencyPlanReviewOverdueScanWorkerHandle {
  appContext: INestApplicationContext;
  worker: Worker;
}

export async function bootstrapEmergencyPlanReviewOverdueScanWorker(): Promise<EmergencyPlanReviewOverdueScanWorkerHandle> {
  const appContext = await NestFactory.createApplicationContext(EmergencyResponseWorkerModule, { logger: ["log", "warn", "error"] });
  const scanService = appContext.get(EmergencyPlanReviewOverdueScanService);

  const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });

  const worker = new Worker(
    EMERGENCY_PLAN_REVIEW_OVERDUE_SCAN_QUEUE,
    async (_job: Job) => {
      await scanService.scan();
    },
    { connection, concurrency: 1 },
  );

  worker.on("completed", () => {
    // eslint-disable-next-line no-console
    console.log(`[qhse-worker] ${EMERGENCY_PLAN_REVIEW_OVERDUE_SCAN_QUEUE} selesai.`);
  });
  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        queue: EMERGENCY_PLAN_REVIEW_OVERDUE_SCAN_QUEUE,
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  });

  return { appContext, worker };
}
