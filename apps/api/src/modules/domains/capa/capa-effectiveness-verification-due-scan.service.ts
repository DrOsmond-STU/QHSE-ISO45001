import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { CapaEffectivenessVerificationDueCandidate, findCapaEffectivenessVerificationDue } from "./capa-effectiveness-verification-due-scan";

/**
 * PRD §8 "Verifikasi efektivitas jatuh tempo | Verifier, HSE Manager".
 * Struktur pola PERSIS CapaRootCauseSlaScanService/LicenseExpiryScanService.
 */
@Injectable()
export class CapaEffectivenessVerificationDueScanService implements OnModuleDestroy {
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
      SELECT DISTINCT tenant_id FROM capa_effectiveness_verification WHERE result = 'PENDING' AND due_reminder_sent_at IS NULL
    `;

    for (const row of rows) {
      try {
        await this.scanForTenant(row.tenant_id, now);
      } catch (err) {
        this.logger.event("error", "capa-effectiveness-verification-due-scan gagal untuk satu tenant", {
          module: "capa",
          action: "capa-effectiveness-verification-due-scan.tenant-failed",
          tenant_id: row.tenant_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async scanForTenant(tenantId: string, now: Date): Promise<void> {
    const notifications = await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx) => {
        const verifications = await tx.capaEffectivenessVerification.findMany({
          where: { result: "PENDING", dueReminderSentAt: null, deletedAt: null },
          select: {
            id: true,
            result: true,
            verificationDueDate: true,
            dueReminderSentAt: true,
            verifiedBy: true,
            capaRegisterId: true,
          },
        });
        if (verifications.length === 0) return [];

        const candidates: CapaEffectivenessVerificationDueCandidate[] = verifications.map((v) => ({
          effectivenessVerificationId: v.id,
          result: v.result,
          verificationDueDate: v.verificationDueDate,
          dueReminderSentAt: v.dueReminderSentAt,
        }));
        const due = findCapaEffectivenessVerificationDue(candidates, now);
        if (due.length === 0) return [];

        await tx.capaEffectivenessVerification.updateMany({
          where: { id: { in: due.map((d) => d.effectivenessVerificationId) } },
          data: { dueReminderSentAt: now },
        });

        this.logger.event("info", "capa-effectiveness-verification-due-scan: reminder diproses", {
          module: "capa",
          action: "capa-effectiveness-verification-due-scan.processed",
          tenant_id: tenantId,
          due_count: due.length,
        });

        const hseManagers = await tx.user.findMany({
          where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
          select: { id: true },
        });
        const hseManagerIds = hseManagers.map((m) => m.id);
        const byId = new Map(verifications.map((v) => [v.id, v]));
        const capaIds = [...new Set(due.map((d) => byId.get(d.effectivenessVerificationId)!.capaRegisterId))];
        const capas = await tx.capaRegister.findMany({ where: { id: { in: capaIds } }, select: { id: true, capaNumber: true } });
        const capaById = new Map(capas.map((c) => [c.id, c]));

        return due.map((d) => {
          const verification = byId.get(d.effectivenessVerificationId)!;
          const capa = capaById.get(verification.capaRegisterId)!;
          return {
            effectivenessVerificationId: verification.id,
            recipientUserIds: [...new Set([verification.verifiedBy, ...hseManagerIds])],
            variables: { capaNumber: capa.capaNumber, verificationDueDate: verification.verificationDueDate.toISOString().slice(0, 10) },
          };
        });
      }),
    );

    for (const n of notifications) {
      for (const recipientUserId of n.recipientUserIds) {
        await tenantContextStorage.run({ tenantId }, () =>
          this.notificationService.enqueue({
            eventType: "CAPA_EFFECTIVENESS_VERIFICATION_DUE",
            entityType: "CAPA_EFFECTIVENESS_VERIFICATION",
            entityId: n.effectivenessVerificationId,
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
