import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppLoggerService } from "../../../../platform/observability/app-logger.service";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../../platform/tenancy/tenant-context";
import { DataImportProcessingService } from "./data-import-processing.service";

const POLL_BATCH_SIZE = 20;

// Shared-hosting adaptation (REDIS_ENABLED=false) — pengganti
// data-import.worker.ts (konsumen BullMQ `data-import`), dipicu
// CronRunnerController. processValidate()/processCommit() SUDAH
// idempoten-by-design lewat tryClaim() atomik (updateMany WHERE status=X,
// lihat banner comment data-import-processing.service.ts) — dibangun
// SEBELUM adaptasi ini krn apps/worker sungguhan sudah bisa overlap dgn
// panggilan langsung di test, jadi TIDAK perlu guard idempotency tambahan
// di sini, cukup panggil ulang utk job yang statusnya masih menunjukkan
// "belum selesai".
@Injectable()
export class DataImportPollService implements OnModuleDestroy {
  private readonly adminPrisma: PrismaClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly processingService: DataImportProcessingService,
    private readonly logger: AppLoggerService,
  ) {
    this.adminPrisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  }

  async onModuleDestroy(): Promise<void> {
    await this.adminPrisma.$disconnect();
  }

  async tick(): Promise<void> {
    const rows = await this.adminPrisma.$queryRaw<Array<{ tenant_id: string }>>`
      SELECT DISTINCT tenant_id FROM data_import_jobs WHERE status IN ('UPLOADED', 'VALIDATED')
    `;

    for (const row of rows) {
      try {
        await this.tickForTenant(row.tenant_id);
      } catch (err) {
        this.logger.event("error", "data-import-poll gagal untuk satu tenant", {
          module: "system-administration",
          action: "data-import-poll.tenant-failed",
          tenant_id: row.tenant_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async tickForTenant(tenantId: string): Promise<void> {
    const jobs = await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls((tx) =>
        tx.dataImportJob.findMany({ where: { tenantId, status: { in: ["UPLOADED", "VALIDATED"] } }, take: POLL_BATCH_SIZE }),
      ),
    );

    let processed = 0;
    for (const job of jobs) {
      if (job.status === "UPLOADED") {
        await this.processingService.processValidate({ tenantId, dataImportJobId: job.id });
        processed += 1;
      } else if (job.status === "VALIDATED") {
        await this.processingService.processCommit({ tenantId, dataImportJobId: job.id });
        processed += 1;
      }
    }

    if (jobs.length > 0) {
      this.logger.event("info", "data-import-poll: job diproses", {
        module: "system-administration",
        action: "data-import-poll.tenant-processed",
        tenant_id: tenantId,
        processed_count: processed,
      });
    }
  }
}
