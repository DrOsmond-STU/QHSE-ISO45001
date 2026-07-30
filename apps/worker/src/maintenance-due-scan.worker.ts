import { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Job, Worker } from "bullmq";
import Redis from "ioredis";
// Deep import ke dist compiled @qhse/api — pola sama worker lain.
import { AssetEquipmentWorkerModule } from "@qhse/api/dist/modules/domains/asset-equipment/asset-equipment-worker.module";
import { MaintenanceDueScanService } from "@qhse/api/dist/modules/domains/asset-equipment/maintenance-due-scan.service";
import { MAINTENANCE_DUE_SCAN_QUEUE } from "@qhse/api/dist/modules/domains/asset-equipment/maintenance-due-scan.constants";

export interface MaintenanceDueScanWorkerHandle {
  appContext: INestApplicationContext;
  worker: Worker;
}

export async function bootstrapMaintenanceDueScanWorker(): Promise<MaintenanceDueScanWorkerHandle> {
  const appContext = await NestFactory.createApplicationContext(AssetEquipmentWorkerModule, { logger: ["log", "warn", "error"] });
  const scanService = appContext.get(MaintenanceDueScanService);

  const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });

  const worker = new Worker(
    MAINTENANCE_DUE_SCAN_QUEUE,
    async (_job: Job) => {
      await scanService.scan();
    },
    { connection, concurrency: 1 },
  );

  worker.on("completed", () => {
    // eslint-disable-next-line no-console
    console.log(`[qhse-worker] ${MAINTENANCE_DUE_SCAN_QUEUE} selesai.`);
  });
  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        queue: MAINTENANCE_DUE_SCAN_QUEUE,
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  });

  return { appContext, worker };
}
