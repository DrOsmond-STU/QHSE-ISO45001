import { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Job, Worker } from "bullmq";
import Redis from "ioredis";
// Deep import ke dist compiled @qhse/api — pola sama worker lain (0.9/1.1/1.4/1.5/2.1).
import { RegulatoryComplianceWorkerModule } from "@qhse/api/dist/modules/domains/regulatory-compliance/regulatory-compliance-worker.module";
import { LicenseExpiryScanService } from "@qhse/api/dist/modules/domains/regulatory-compliance/license-expiry-scan.service";
import { LICENSE_EXPIRY_SCAN_QUEUE } from "@qhse/api/dist/modules/domains/regulatory-compliance/license-expiry-scan.constants";

export interface LicenseExpiryScanWorkerHandle {
  appContext: INestApplicationContext;
  worker: Worker;
}

/**
 * TDD §13.1 — konsumen BullMQ license-expiry-scan. Pola persis
 * bootstrapDocumentReviewScanWorker (2.1).
 */
export async function bootstrapLicenseExpiryScanWorker(): Promise<LicenseExpiryScanWorkerHandle> {
  const appContext = await NestFactory.createApplicationContext(RegulatoryComplianceWorkerModule, {
    logger: ["log", "warn", "error"],
  });
  const scanService = appContext.get(LicenseExpiryScanService);

  const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });

  const worker = new Worker(
    LICENSE_EXPIRY_SCAN_QUEUE,
    async (_job: Job) => {
      await scanService.scan();
    },
    { connection, concurrency: 1 },
  );

  worker.on("completed", () => {
    // eslint-disable-next-line no-console
    console.log(`[qhse-worker] ${LICENSE_EXPIRY_SCAN_QUEUE} selesai.`);
  });
  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        queue: LICENSE_EXPIRY_SCAN_QUEUE,
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  });

  return { appContext, worker };
}
