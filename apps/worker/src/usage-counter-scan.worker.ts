import { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Job, Worker } from "bullmq";
import Redis from "ioredis";
// Deep import ke dist compiled @qhse/api — pola sama worker lain (0.9/1.1/1.3/1.4).
import { SystemAdministrationWorkerModule } from "@qhse/api/dist/modules/domains/system-administration/system-administration-worker.module";
import { UsageCounterScanService } from "@qhse/api/dist/modules/domains/system-administration/provisioning/usage-counter-scan.service";
import { USAGE_COUNTER_SCAN_QUEUE } from "@qhse/api/dist/modules/domains/system-administration/provisioning/usage-counter-scan.constants";

export interface UsageCounterScanWorkerHandle {
  appContext: INestApplicationContext;
  worker: Worker;
}

/**
 * TDD §13.1 — konsumen BullMQ usage-counter-scan. Pola persis
 * bootstrapReminderScanWorker (1.1)/bootstrapDelegationScanWorker (1.4).
 */
export async function bootstrapUsageCounterScanWorker(): Promise<UsageCounterScanWorkerHandle> {
  const appContext = await NestFactory.createApplicationContext(SystemAdministrationWorkerModule, {
    logger: ["log", "warn", "error"],
  });
  const scanService = appContext.get(UsageCounterScanService);

  const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });

  const worker = new Worker(
    USAGE_COUNTER_SCAN_QUEUE,
    async (_job: Job) => {
      await scanService.scan();
    },
    { connection, concurrency: 1 },
  );

  worker.on("completed", () => {
    // eslint-disable-next-line no-console
    console.log(`[qhse-worker] ${USAGE_COUNTER_SCAN_QUEUE} selesai.`);
  });
  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        queue: USAGE_COUNTER_SCAN_QUEUE,
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  });

  return { appContext, worker };
}
