import { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Job, Worker } from "bullmq";
import Redis from "ioredis";
// Deep import ke dist compiled @qhse/api — pola sama worker lain.
import { OccupationalHealthWorkerModule } from "@qhse/api/dist/modules/domains/occupational-health/occupational-health-worker.module";
import { McuReminderScanService } from "@qhse/api/dist/modules/domains/occupational-health/mcu-reminder-scan.service";
import { MCU_REMINDER_SCAN_QUEUE } from "@qhse/api/dist/modules/domains/occupational-health/mcu-reminder-scan.constants";

export interface McuReminderScanWorkerHandle {
  appContext: INestApplicationContext;
  worker: Worker;
}

export async function bootstrapMcuReminderScanWorker(): Promise<McuReminderScanWorkerHandle> {
  const appContext = await NestFactory.createApplicationContext(OccupationalHealthWorkerModule, { logger: ["log", "warn", "error"] });
  const scanService = appContext.get(McuReminderScanService);

  const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });

  const worker = new Worker(
    MCU_REMINDER_SCAN_QUEUE,
    async (_job: Job) => {
      await scanService.scan();
    },
    { connection, concurrency: 1 },
  );

  worker.on("completed", () => {
    // eslint-disable-next-line no-console
    console.log(`[qhse-worker] ${MCU_REMINDER_SCAN_QUEUE} selesai.`);
  });
  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        queue: MCU_REMINDER_SCAN_QUEUE,
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  });

  return { appContext, worker };
}
