import { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Job, Worker } from "bullmq";
import Redis from "ioredis";
// Deep import ke dist compiled @qhse/api — pola sama worker lain.
import { InspectionWorkerModule } from "@qhse/api/dist/modules/domains/inspection/inspection-worker.module";
import { InspectionFindingSlaScanService } from "@qhse/api/dist/modules/domains/inspection/inspection-finding-sla-scan.service";
import { INSPECTION_FINDING_SLA_SCAN_QUEUE } from "@qhse/api/dist/modules/domains/inspection/inspection-finding-sla-scan.constants";

export interface InspectionFindingSlaScanWorkerHandle {
  appContext: INestApplicationContext;
  worker: Worker;
}

export async function bootstrapInspectionFindingSlaScanWorker(): Promise<InspectionFindingSlaScanWorkerHandle> {
  const appContext = await NestFactory.createApplicationContext(InspectionWorkerModule, { logger: ["log", "warn", "error"] });
  const scanService = appContext.get(InspectionFindingSlaScanService);

  const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });

  const worker = new Worker(
    INSPECTION_FINDING_SLA_SCAN_QUEUE,
    async (_job: Job) => {
      await scanService.scan();
    },
    { connection, concurrency: 1 },
  );

  worker.on("completed", () => {
    // eslint-disable-next-line no-console
    console.log(`[qhse-worker] ${INSPECTION_FINDING_SLA_SCAN_QUEUE} selesai.`);
  });
  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        queue: INSPECTION_FINDING_SLA_SCAN_QUEUE,
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  });

  return { appContext, worker };
}
