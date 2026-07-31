import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppLoggerService } from "../observability/app-logger.service";
import { PrismaService } from "../tenancy/prisma.service";
import { tenantContextStorage } from "../tenancy/tenant-context";
import { AttachmentScanService } from "./attachment-scan.service";

const POLL_BATCH_SIZE = 50;

// Shared-hosting adaptation (REDIS_ENABLED=false) — pengganti
// attachment-scan.worker.ts (konsumen BullMQ `attachment-scan`), dipicu
// CronRunnerController. AttachmentScanJobPayload (tenantId, attachmentId,
// storageKey, mimeType) SELURUHNYA rekonstruksi langsung dari baris
// `attachments` sendiri (fileUrl=storageKey) — TIDAK ada rendering/state
// tambahan spt notification (lihat notification-poll.service.ts), jadi
// TIDAK butuh kolom baru di schema.
@Injectable()
export class AttachmentPollService implements OnModuleDestroy {
  private readonly adminPrisma: PrismaClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly scanService: AttachmentScanService,
    private readonly logger: AppLoggerService,
  ) {
    this.adminPrisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  }

  async onModuleDestroy(): Promise<void> {
    await this.adminPrisma.$disconnect();
  }

  async tick(): Promise<void> {
    const rows = await this.adminPrisma.$queryRaw<Array<{ tenant_id: string }>>`
      SELECT DISTINCT tenant_id FROM attachments WHERE scan_status = 'PENDING_SCAN'
    `;

    for (const row of rows) {
      try {
        await this.tickForTenant(row.tenant_id);
      } catch (err) {
        this.logger.event("error", "attachment-poll gagal untuk satu tenant", {
          module: "attachment",
          action: "attachment-poll.tenant-failed",
          tenant_id: row.tenant_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async tickForTenant(tenantId: string): Promise<void> {
    const pending = await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls((tx) => tx.attachment.findMany({ where: { tenantId, scanStatus: "PENDING_SCAN" }, take: POLL_BATCH_SIZE })),
    );

    for (const attachment of pending) {
      await this.scanService.processScanJob({
        tenantId,
        attachmentId: attachment.id,
        storageKey: attachment.fileUrl,
        mimeType: attachment.mimeType,
      });
    }

    if (pending.length > 0) {
      this.logger.event("info", "attachment-poll: baris diproses", {
        module: "attachment",
        action: "attachment-poll.tenant-processed",
        tenant_id: tenantId,
        processed_count: pending.length,
      });
    }
  }
}
