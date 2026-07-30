import { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Job, Worker } from "bullmq";
import Redis from "ioredis";
// Deep import ke dist compiled @qhse/api — pola sama worker lain.
import { ContractorWorkerModule } from "@qhse/api/dist/modules/domains/contractor/contractor-worker.module";
import { ContractorDueScanService } from "@qhse/api/dist/modules/domains/contractor/contractor-due-scan.service";
import { CONTRACTOR_DUE_SCAN_QUEUE } from "@qhse/api/dist/modules/domains/contractor/contractor-due-scan.constants";

export interface ContractorDueScanWorkerHandle {
  appContext: INestApplicationContext;
  worker: Worker;
}

export async function bootstrapContractorDueScanWorker(): Promise<ContractorDueScanWorkerHandle> {
  const appContext = await NestFactory.createApplicationContext(ContractorWorkerModule, { logger: ["log", "warn", "error"] });
  const scanService = appContext.get(ContractorDueScanService);

  const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });

  const worker = new Worker(
    CONTRACTOR_DUE_SCAN_QUEUE,
    async (_job: Job) => {
      await scanService.scan();
    },
    { connection, concurrency: 1 },
  );

  worker.on("completed", () => {
    // eslint-disable-next-line no-console
    console.log(`[qhse-worker] ${CONTRACTOR_DUE_SCAN_QUEUE} selesai.`);
  });
  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        queue: CONTRACTOR_DUE_SCAN_QUEUE,
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  });

  return { appContext, worker };
}
