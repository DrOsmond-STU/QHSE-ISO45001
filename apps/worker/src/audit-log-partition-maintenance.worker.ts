import { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Job, Worker } from "bullmq";
import Redis from "ioredis";
// Deep import ke dist compiled @qhse/api — pola sama workflow-sla-scan.worker.ts
// (0.9): package.json @qhse/api tidak restriktif, tsconfig declaration:true
// jadi .d.ts asli, bukan ambient shim.
import { AuditLogWorkerModule } from "@qhse/api/dist/platform/audit-log/audit-log-worker.module";
import { AuditLogPartitionMaintenanceService } from "@qhse/api/dist/platform/audit-log/audit-log-partition-maintenance.service";
import { AUDIT_LOG_PARTITION_MAINTENANCE_QUEUE } from "@qhse/api/dist/platform/audit-log/audit-log.constants";

export interface AuditLogPartitionMaintenanceWorkerHandle {
  appContext: INestApplicationContext;
  worker: Worker;
}

/**
 * TDD §13.1 — konsumen BullMQ audit-log-partition-maintenance. Pola persis
 * bootstrapWorkflowSlaScanWorker (0.9): ApplicationContext + service
 * di-resolve SEKALI, dipakai ulang lintas firing job (bukan re-resolve tiap
 * job — job ini pun idempotent jadi aman dipanggil `run()` tanpa argumen,
 * default `now()`).
 */
export async function bootstrapAuditLogPartitionMaintenanceWorker(): Promise<AuditLogPartitionMaintenanceWorkerHandle> {
  const appContext = await NestFactory.createApplicationContext(AuditLogWorkerModule, {
    logger: ["log", "warn", "error"],
  });
  const maintenanceService = appContext.get(AuditLogPartitionMaintenanceService);

  const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });

  const worker = new Worker(
    AUDIT_LOG_PARTITION_MAINTENANCE_QUEUE,
    async (_job: Job) => {
      await maintenanceService.run();
    },
    { connection, concurrency: 1 },
  );

  worker.on("completed", () => {
    // eslint-disable-next-line no-console
    console.log(`[qhse-worker] ${AUDIT_LOG_PARTITION_MAINTENANCE_QUEUE} selesai.`);
  });
  worker.on("failed", (job, err) => {
    // TDD §13.2 — job gagal permanen: alert, bukan diam-diam log. Alertmanager
    // sungguhan belum ada (DEPLOYMENT.md/TDD §15 — infra terpisah) — structured
    // console error sebagai placeholder eksplisit, pola sama worker lain.
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        queue: AUDIT_LOG_PARTITION_MAINTENANCE_QUEUE,
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  });

  return { appContext, worker };
}
