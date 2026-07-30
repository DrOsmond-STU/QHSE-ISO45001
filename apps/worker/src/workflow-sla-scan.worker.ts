import { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Job, Worker } from "bullmq";
import Redis from "ioredis";
// @qhse/api tidak punya "main"/"exports" restriktif di package.json — deep
// subpath import ke dist compiled-nya jalan bersih via pnpm workspace:*
// linking, dan sejak apps/api/tsconfig.json diset declaration:true (task
// 0.9), TypeScript baca .d.ts ASLI (bukan ambient shim tangan yang bisa
// basi diam-diam).
import { WorkflowEngineWorkerModule } from "@qhse/api/dist/platform/workflow-engine/workflow-engine-worker.module";
import { WorkflowSlaScanService } from "@qhse/api/dist/platform/workflow-engine/workflow-sla-scan.service";
import { WORKFLOW_SLA_SCAN_QUEUE } from "@qhse/api/dist/platform/workflow-engine/workflow-engine.constants";

export interface WorkflowSlaScanWorkerHandle {
  appContext: INestApplicationContext;
  worker: Worker;
}

/**
 * TDD §9/§13.1 — konsumen BullMQ workflow-sla-scan. ApplicationContext
 * di-boot SEKALI, WorkflowSlaScanService di-resolve SEKALI, dipakai ulang
 * lintas job — bukan re-resolve per job (tidak ada manfaatnya di sini).
 * createApplicationContext() TIDAK buka HTTP server — murni DI container;
 * Worker BullMQ jalan sendiri (polling loop internal) di proses yang sama.
 */
export async function bootstrapWorkflowSlaScanWorker(): Promise<WorkflowSlaScanWorkerHandle> {
  const appContext = await NestFactory.createApplicationContext(WorkflowEngineWorkerModule, {
    logger: ["log", "warn", "error"],
  });
  const scanService = appContext.get(WorkflowSlaScanService);

  // Koneksi ioredis SENDIRI (bukan reuse apa pun dari apps/api) — BullMQ
  // Worker wajib maxRetriesPerRequest:null.
  const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });

  const worker = new Worker(
    WORKFLOW_SLA_SCAN_QUEUE,
    async (_job: Job) => {
      await scanService.scan();
    },
    { connection, concurrency: 1 },
  );

  worker.on("completed", () => {
    // eslint-disable-next-line no-console
    console.log(`[qhse-worker] ${WORKFLOW_SLA_SCAN_QUEUE} scan selesai.`);
  });
  worker.on("failed", (job, err) => {
    // TDD §13.2 — job gagal permanen: alert, bukan diam-diam log. Pino
    // terstruktur (AppLoggerService) sudah ada sejak task 0.13, tapi worker
    // ini belum diretrofit memakainya (di luar cakupan 0.13 — lihat TDD §26);
    // Alertmanager/Grafana alerting sungguhan (TDD §15) masih infra terpisah
    // yang belum ada. structured console error di bawah placeholder eksplisit
    // sementara, bukan silent catch.
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        queue: WORKFLOW_SLA_SCAN_QUEUE,
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  });

  return { appContext, worker };
}
