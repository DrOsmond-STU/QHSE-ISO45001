import { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Job, Worker } from "bullmq";
import Redis from "ioredis";
// Deep subpath import ke dist compiled @qhse/api — pola sama persis
// workflow-sla-scan.worker.ts (task 0.9) / notification.worker.ts (0.11).
import { AttachmentScanJobPayload } from "@qhse/api/dist/platform/attachment/attachment-scan-job.types";
import { AttachmentScanService } from "@qhse/api/dist/platform/attachment/attachment-scan.service";
import { ATTACHMENT_SCAN_QUEUE } from "@qhse/api/dist/platform/attachment/attachment.constants";
import { AttachmentWorkerModule } from "@qhse/api/dist/platform/attachment/attachment-worker.module";

export interface AttachmentScanWorkerHandle {
  appContext: INestApplicationContext;
  worker: Worker;
}

/**
 * TDD §11/§13.1 — konsumen BullMQ attachment-scan. Pola sama persis
 * workflow-sla-scan.worker.ts (task 0.9): ApplicationContext di-boot
 * SEKALI, AttachmentScanService di-resolve SEKALI, dipakai ulang lintas
 * job. TIDAK ada dead-letter queue terpisah di sini (beda dari
 * notification.worker.ts 0.11) — lihat komentar banner
 * AttachmentScanService, acceptance criterion task 0.12 tidak
 * memintanya; structured console error di worker.on('failed') (placeholder
 * sementara — Pino terstruktur tersedia sejak task 0.13 tapi worker ini
 * belum diretrofit memakainya, di luar cakupan 0.13/TDD §26; Alertmanager/
 * Grafana alerting sungguhan TDD §15 masih infra terpisah) sudah cukup.
 */
export async function bootstrapAttachmentScanWorker(): Promise<AttachmentScanWorkerHandle> {
  const appContext = await NestFactory.createApplicationContext(AttachmentWorkerModule, {
    logger: ["log", "warn", "error"],
  });
  const scanService = appContext.get(AttachmentScanService);

  const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });

  const worker = new Worker(
    ATTACHMENT_SCAN_QUEUE,
    async (job: Job<AttachmentScanJobPayload>) => {
      await scanService.processScanJob(job.data);
    },
    { connection, concurrency: 3 },
  );

  worker.on("completed", (job) => {
    // eslint-disable-next-line no-console
    console.log(`[qhse-worker] ${ATTACHMENT_SCAN_QUEUE} job ${job.id} (attachment ${job.data.attachmentId}) selesai.`);
  });

  worker.on("failed", (job, err) => {
    // TDD §13.2 — job gagal: alert, bukan diam-diam log. Alert sungguhan
    // (Alertmanager/Grafana, TDD §15) masih infra terpisah yang belum ada —
    // Pino terstruktur (AppLoggerService, task 0.13) sudah tersedia tapi
    // worker ini belum diretrofit memakainya (di luar cakupan 0.13, TDD §26).
    // structured console error di bawah placeholder eksplisit sementara,
    // pola sama workflow-sla-scan.worker.ts (task 0.9).
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        queue: ATTACHMENT_SCAN_QUEUE,
        jobId: job?.id,
        attachmentId: job?.data?.attachmentId,
        attemptsMade: job?.attemptsMade,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  });

  return { appContext, worker };
}
