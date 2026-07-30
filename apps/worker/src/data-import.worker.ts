import { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Job, Worker } from "bullmq";
import Redis from "ioredis";
// Deep subpath import ke dist compiled @qhse/api — pola sama persis
// attachment-scan.worker.ts (0.12).
import { DataImportJobPayload } from "@qhse/api/dist/modules/domains/system-administration/data-import/data-import-job.types";
import { DataImportProcessingService } from "@qhse/api/dist/modules/domains/system-administration/data-import/data-import-processing.service";
import { DATA_IMPORT_QUEUE } from "@qhse/api/dist/modules/domains/system-administration/data-import/data-import.constants";
import { SystemAdministrationWorkerModule } from "@qhse/api/dist/modules/domains/system-administration/system-administration-worker.module";

export interface DataImportWorkerHandle {
  appContext: INestApplicationContext;
  worker: Worker;
}

/**
 * TDD §13.1/§20 — konsumen BullMQ `data-import`. SATU queue, DUA job name
 * (validate/commit) — dispatch by job.name lewat
 * DataImportProcessingService.process(), bukan dua Worker terpisah (queue
 * yang sama, payload yang sama, hanya tahap berbeda). Pola bootstrap
 * ApplicationContext SEKALI + service di-resolve SEKALI identik
 * attachment-scan.worker.ts (0.12). TIDAK ada dead-letter queue terpisah
 * (alasan sama attachment-scan.worker.ts) — BullMQ retry+backoff (lihat
 * data-import.constants.ts, attempts tinggi utk "validate" SENGAJA dipakai
 * jadi mekanisme tunggu-scan-malware) + structured console error di
 * worker.on('failed') sudah cukup.
 */
export async function bootstrapDataImportWorker(): Promise<DataImportWorkerHandle> {
  const appContext = await NestFactory.createApplicationContext(SystemAdministrationWorkerModule, {
    logger: ["log", "warn", "error"],
  });
  const processingService = appContext.get(DataImportProcessingService);

  const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });

  const worker = new Worker(
    DATA_IMPORT_QUEUE,
    async (job: Job<DataImportJobPayload>) => {
      await processingService.process(job.name, job.data);
    },
    { connection, concurrency: 3 },
  );

  worker.on("completed", (job) => {
    // eslint-disable-next-line no-console
    console.log(`[qhse-worker] ${DATA_IMPORT_QUEUE}/${job.name} job ${job.id} (data_import_job ${job.data.dataImportJobId}) selesai.`);
  });

  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        queue: DATA_IMPORT_QUEUE,
        jobName: job?.name,
        jobId: job?.id,
        dataImportJobId: job?.data?.dataImportJobId,
        attemptsMade: job?.attemptsMade,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  });

  return { appContext, worker };
}
