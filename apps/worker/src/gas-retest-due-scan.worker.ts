import { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Job, Worker } from "bullmq";
import Redis from "ioredis";
// Deep import ke dist compiled @qhse/api — pola sama worker lain.
import { WorkPermitWorkerModule } from "@qhse/api/dist/modules/domains/work-permit/work-permit-worker.module";
import { GasRetestDueScanService } from "@qhse/api/dist/modules/domains/work-permit/gas-retest-due-scan.service";
import { GAS_RETEST_DUE_SCAN_QUEUE } from "@qhse/api/dist/modules/domains/work-permit/gas-retest-due-scan.constants";

export interface GasRetestDueScanWorkerHandle {
  appContext: INestApplicationContext;
  worker: Worker;
}

export async function bootstrapGasRetestDueScanWorker(): Promise<GasRetestDueScanWorkerHandle> {
  const appContext = await NestFactory.createApplicationContext(WorkPermitWorkerModule, { logger: ["log", "warn", "error"] });
  const scanService = appContext.get(GasRetestDueScanService);

  const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });

  const worker = new Worker(
    GAS_RETEST_DUE_SCAN_QUEUE,
    async (_job: Job) => {
      await scanService.scan();
    },
    { connection, concurrency: 1 },
  );

  worker.on("completed", () => {
    // eslint-disable-next-line no-console
    console.log(`[qhse-worker] ${GAS_RETEST_DUE_SCAN_QUEUE} selesai.`);
  });
  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({ level: "error", queue: GAS_RETEST_DUE_SCAN_QUEUE, jobId: job?.id, attemptsMade: job?.attemptsMade, error: err instanceof Error ? err.message : String(err) }),
    );
  });

  return { appContext, worker };
}
