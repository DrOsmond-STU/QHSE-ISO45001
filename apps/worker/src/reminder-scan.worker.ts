import { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Job, Worker } from "bullmq";
import Redis from "ioredis";
// Deep import ke dist compiled @qhse/api — pola sama worker lain (0.9/0.13).
import { OrganizationWorkerModule } from "@qhse/api/dist/modules/domains/organization/organization-worker.module";
import { ReminderScanService } from "@qhse/api/dist/modules/domains/organization/reminder-scan.service";
import { REMINDER_SCAN_QUEUE } from "@qhse/api/dist/modules/domains/organization/reminder-scan.constants";

export interface ReminderScanWorkerHandle {
  appContext: INestApplicationContext;
  worker: Worker;
}

/**
 * TDD §13.1 — konsumen BullMQ reminder-scan. Pola persis
 * bootstrapWorkflowSlaScanWorker (0.9) / bootstrapAuditLogPartitionMaintenanceWorker
 * (0.13).
 */
export async function bootstrapReminderScanWorker(): Promise<ReminderScanWorkerHandle> {
  const appContext = await NestFactory.createApplicationContext(OrganizationWorkerModule, {
    logger: ["log", "warn", "error"],
  });
  const scanService = appContext.get(ReminderScanService);

  const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });

  const worker = new Worker(
    REMINDER_SCAN_QUEUE,
    async (_job: Job) => {
      await scanService.scan();
    },
    { connection, concurrency: 1 },
  );

  worker.on("completed", () => {
    // eslint-disable-next-line no-console
    console.log(`[qhse-worker] ${REMINDER_SCAN_QUEUE} selesai.`);
  });
  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        queue: REMINDER_SCAN_QUEUE,
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  });

  return { appContext, worker };
}
