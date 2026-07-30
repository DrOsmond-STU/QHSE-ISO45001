import { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Job, Worker } from "bullmq";
import Redis from "ioredis";
// Deep import ke dist compiled @qhse/api — pola sama worker lain.
import { AuditWorkerModule } from "@qhse/api/dist/modules/domains/audit/audit-worker.module";
import { AuditFindingClosureDueScanService } from "@qhse/api/dist/modules/domains/audit/audit-finding-closure-due-scan.service";
import { AUDIT_FINDING_CLOSURE_DUE_SCAN_QUEUE } from "@qhse/api/dist/modules/domains/audit/audit-finding-closure-due-scan.constants";

export interface AuditFindingClosureDueScanWorkerHandle {
  appContext: INestApplicationContext;
  worker: Worker;
}

export async function bootstrapAuditFindingClosureDueScanWorker(): Promise<AuditFindingClosureDueScanWorkerHandle> {
  const appContext = await NestFactory.createApplicationContext(AuditWorkerModule, { logger: ["log", "warn", "error"] });
  const scanService = appContext.get(AuditFindingClosureDueScanService);

  const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });

  const worker = new Worker(
    AUDIT_FINDING_CLOSURE_DUE_SCAN_QUEUE,
    async (_job: Job) => {
      await scanService.scan();
    },
    { connection, concurrency: 1 },
  );

  worker.on("completed", () => {
    // eslint-disable-next-line no-console
    console.log(`[qhse-worker] ${AUDIT_FINDING_CLOSURE_DUE_SCAN_QUEUE} selesai.`);
  });
  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        queue: AUDIT_FINDING_CLOSURE_DUE_SCAN_QUEUE,
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  });

  return { appContext, worker };
}
