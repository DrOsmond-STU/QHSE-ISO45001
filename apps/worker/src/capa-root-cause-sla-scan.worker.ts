import { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Job, Worker } from "bullmq";
import Redis from "ioredis";
// Deep import ke dist compiled @qhse/api — pola sama worker lain.
import { CapaWorkerModule } from "@qhse/api/dist/modules/domains/capa/capa-worker.module";
import { CapaRootCauseSlaScanService } from "@qhse/api/dist/modules/domains/capa/capa-root-cause-sla-scan.service";
import { CAPA_ROOT_CAUSE_SLA_SCAN_QUEUE } from "@qhse/api/dist/modules/domains/capa/capa-root-cause-sla-scan.constants";

export interface CapaRootCauseSlaScanWorkerHandle {
  appContext: INestApplicationContext;
  worker: Worker;
}

export async function bootstrapCapaRootCauseSlaScanWorker(): Promise<CapaRootCauseSlaScanWorkerHandle> {
  const appContext = await NestFactory.createApplicationContext(CapaWorkerModule, { logger: ["log", "warn", "error"] });
  const scanService = appContext.get(CapaRootCauseSlaScanService);

  const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });

  const worker = new Worker(
    CAPA_ROOT_CAUSE_SLA_SCAN_QUEUE,
    async (_job: Job) => {
      await scanService.scan();
    },
    { connection, concurrency: 1 },
  );

  worker.on("completed", () => {
    // eslint-disable-next-line no-console
    console.log(`[qhse-worker] ${CAPA_ROOT_CAUSE_SLA_SCAN_QUEUE} selesai.`);
  });
  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        queue: CAPA_ROOT_CAUSE_SLA_SCAN_QUEUE,
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  });

  return { appContext, worker };
}
