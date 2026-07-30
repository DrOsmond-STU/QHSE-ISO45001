import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { CapaRootCauseSlaCandidate, findCapaRootCauseSlaDue } from "./capa-root-cause-sla-scan";

/**
 * PRD §8 "Root cause belum diisi mendekati SLA | PIC, HSE Manager". CAPA
 * TIDAK py kolom "PIC" tersendiri di capa_register (BEDA dari capa_action_plans.
 * pic_user_id) — disubstitusi capa_register.initiated_by (kandidat paling
 * plausible, orang yang membuat CAPA), pola sama AuditFindingClosureDueScanService
 * (4.1) mensubstitusi "PIC CAPA" dgn lead_auditor_id saat CAPA belum ada.
 * Struktur pola PERSIS LicenseExpiryScanService (2.2): idempotency
 * updateMany DI DALAM transaksi withRls, enqueue() loop DI LUAR (notification
 * service buka transaksinya sendiri — hindari nested $transaction, lihat
 * memory).
 */
@Injectable()
export class CapaRootCauseSlaScanService implements OnModuleDestroy {
  private readonly adminPrisma: PrismaClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly logger: AppLoggerService,
  ) {
    this.adminPrisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  }

  async onModuleDestroy(): Promise<void> {
    await this.adminPrisma.$disconnect();
  }

  async scan(now: Date = new Date()): Promise<void> {
    const rows = await this.adminPrisma.$queryRaw<Array<{ tenant_id: string }>>`
      SELECT DISTINCT tenant_id FROM capa_register WHERE status = 'DRAFT' AND root_cause_sla_reminder_sent_at IS NULL
    `;

    for (const row of rows) {
      try {
        await this.scanForTenant(row.tenant_id, now);
      } catch (err) {
        this.logger.event("error", "capa-root-cause-sla-scan gagal untuk satu tenant", {
          module: "capa",
          action: "capa-root-cause-sla-scan.tenant-failed",
          tenant_id: row.tenant_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async scanForTenant(tenantId: string, now: Date): Promise<void> {
    const notifications = await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx) => {
        const capas = await tx.capaRegister.findMany({
          where: { status: "DRAFT", rootCauseSlaReminderSentAt: null, deletedAt: null },
          select: { id: true, capaNumber: true, status: true, initiatedAt: true, initiatedBy: true, rootCauseSlaReminderSentAt: true },
        });
        if (capas.length === 0) return [];

        const candidates: CapaRootCauseSlaCandidate[] = capas.map((c) => ({
          capaRegisterId: c.id,
          status: c.status,
          initiatedAt: c.initiatedAt,
          rootCauseSlaReminderSentAt: c.rootCauseSlaReminderSentAt,
        }));
        const due = findCapaRootCauseSlaDue(candidates, now);
        if (due.length === 0) return [];

        await tx.capaRegister.updateMany({
          where: { id: { in: due.map((d) => d.capaRegisterId) } },
          data: { rootCauseSlaReminderSentAt: now },
        });

        this.logger.event("info", "capa-root-cause-sla-scan: reminder diproses", {
          module: "capa",
          action: "capa-root-cause-sla-scan.processed",
          tenant_id: tenantId,
          due_count: due.length,
        });

        const hseManagers = await tx.user.findMany({
          where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
          select: { id: true },
        });
        const hseManagerIds = hseManagers.map((m) => m.id);
        const byId = new Map(capas.map((c) => [c.id, c]));

        return due.map((d) => {
          const capa = byId.get(d.capaRegisterId)!;
          return {
            capaRegisterId: capa.id,
            recipientUserIds: [...new Set([capa.initiatedBy, ...hseManagerIds])],
            variables: { capaNumber: capa.capaNumber },
          };
        });
      }),
    );

    for (const n of notifications) {
      for (const recipientUserId of n.recipientUserIds) {
        await tenantContextStorage.run({ tenantId }, () =>
          this.notificationService.enqueue({
            eventType: "CAPA_ROOT_CAUSE_SLA_DUE",
            entityType: "CAPA_REGISTER",
            entityId: n.capaRegisterId,
            recipientUserId,
            priority: "MEDIUM",
            eventCategory: "CAPA",
            variables: n.variables,
          }),
        );
      }
    }
  }
}
