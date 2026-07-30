import { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Job, Worker } from "bullmq";
import Redis from "ioredis";
// Deep import ke dist compiled @qhse/api — pola sama worker lain.
import { AuditWorkerModule } from "@qhse/api/dist/modules/domains/audit/audit-worker.module";
import { AuditorCompetencyExpiryScanService } from "@qhse/api/dist/modules/domains/audit/auditor-competency-expiry-scan.service";
import { AUDITOR_COMPETENCY_EXPIRY_SCAN_QUEUE } from "@qhse/api/dist/modules/domains/audit/auditor-competency-expiry-scan.constants";

export interface AuditorCompetencyExpiryScanWorkerHandle {
  appContext: INestApplicationContext;
  worker: Worker;
}

export async function bootstrapAuditorCompetencyExpiryScanWorker(): Promise<AuditorCompetencyExpiryScanWorkerHandle> {
  const appContext = await NestFactory.createApplicationContext(AuditWorkerModule, { logger: ["log", "warn", "error"] });
  const scanService = appContext.get(AuditorCompetencyExpiryScanService);

  const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });

  const worker = new Worker(
    AUDITOR_COMPETENCY_EXPIRY_SCAN_QUEUE,
    async (_job: Job) => {
      await scanService.scan();
    },
    { connection, concurrency: 1 },
  );

  worker.on("completed", () => {
    // eslint-disable-next-line no-console
    console.log(`[qhse-worker] ${AUDITOR_COMPETENCY_EXPIRY_SCAN_QUEUE} selesai.`);
  });
  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        queue: AUDITOR_COMPETENCY_EXPIRY_SCAN_QUEUE,
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  });

  return { appContext, worker };
}
