import { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Job, Worker } from "bullmq";
import Redis from "ioredis";
// Deep import ke dist compiled @qhse/api — pola sama worker lain (0.9/1.1/1.3).
import { UserRoleWorkerModule } from "@qhse/api/dist/modules/domains/user-role/user-role-worker.module";
import { DelegationScanService } from "@qhse/api/dist/modules/domains/user-role/delegation/delegation-scan.service";
import { DELEGATION_SCAN_QUEUE } from "@qhse/api/dist/modules/domains/user-role/delegation/delegation-scan.constants";

export interface DelegationScanWorkerHandle {
  appContext: INestApplicationContext;
  worker: Worker;
}

/**
 * TDD §13.1 — konsumen BullMQ delegation-scan. Pola persis
 * bootstrapReminderScanWorker (1.1) / bootstrapWorkflowSlaScanWorker (0.9).
 */
export async function bootstrapDelegationScanWorker(): Promise<DelegationScanWorkerHandle> {
  const appContext = await NestFactory.createApplicationContext(UserRoleWorkerModule, {
    logger: ["log", "warn", "error"],
  });
  const scanService = appContext.get(DelegationScanService);

  const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });

  const worker = new Worker(
    DELEGATION_SCAN_QUEUE,
    async (_job: Job) => {
      await scanService.scan();
    },
    { connection, concurrency: 1 },
  );

  worker.on("completed", () => {
    // eslint-disable-next-line no-console
    console.log(`[qhse-worker] ${DELEGATION_SCAN_QUEUE} selesai.`);
  });
  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        queue: DELEGATION_SCAN_QUEUE,
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  });

  return { appContext, worker };
}
