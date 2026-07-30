import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import {
  ExpiryReminderTier,
  findExpiredLicenses,
  findLicenseExpiryReminderTiers,
  findLicensesEnteringExpiringSoon,
  LicenseExpiryCandidate,
} from "./license-expiry-scan";

const TIER_COLUMN: Record<ExpiryReminderTier, "expiryReminder90SentAt" | "expiryReminder30SentAt" | "expiryReminder7SentAt"> = {
  90: "expiryReminder90SentAt",
  30: "expiryReminder30SentAt",
  7: "expiryReminder7SentAt",
};

// TDD §13.1/§9 pola job cross-tenant (sama persis DocumentReviewScanService,
// 2.1). BR-01 (-> EXPIRING_SOON) + BR-02 (-> EXPIRED) + notifikasi
// bertingkat H-90/H-30/H-7 (PRD §4.3 poin 1/§8) DIGABUNG SATU scan (satu
// tabel licenses_permits, pola sama delegation-scan 1.4/document-review-scan
// 2.1 yang menggabung beberapa concern atas tabel yang sama).
@Injectable()
export class LicenseExpiryScanService implements OnModuleDestroy {
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
      SELECT DISTINCT tenant_id FROM licenses_permits WHERE status IN ('ACTIVE', 'EXPIRING_SOON', 'IN_RENEWAL_PROCESS')
    `;

    for (const row of rows) {
      try {
        await this.scanForTenant(row.tenant_id, now);
      } catch (err) {
        this.logger.event("error", "license-expiry-scan gagal untuk satu tenant", {
          module: "regulatory-compliance",
          action: "license-expiry-scan.tenant-failed",
          tenant_id: row.tenant_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async scanForTenant(tenantId: string, now: Date): Promise<void> {
    const notifications = await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx) => {
        const licenses = await tx.licensePermit.findMany({
          where: { status: { in: ["ACTIVE", "EXPIRING_SOON", "IN_RENEWAL_PROCESS"] }, deletedAt: null },
        });
        if (licenses.length === 0) return [];

        const candidates: LicenseExpiryCandidate[] = licenses.map((l) => ({
          licenseId: l.id,
          expiryDate: l.expiryDate,
          renewalLeadTimeDays: l.renewalLeadTimeDays,
          status: l.status,
          expiryReminder90SentAt: l.expiryReminder90SentAt,
          expiryReminder30SentAt: l.expiryReminder30SentAt,
          expiryReminder7SentAt: l.expiryReminder7SentAt,
        }));

        const enteringExpiringSoonIds = new Set(findLicensesEnteringExpiringSoon(candidates, now).map((c) => c.licenseId));
        const expiredIds = new Set(findExpiredLicenses(candidates, now).map((c) => c.licenseId));
        const reminderTiersDue = findLicenseExpiryReminderTiers(candidates, now);

        if (enteringExpiringSoonIds.size > 0) {
          await tx.licensePermit.updateMany({ where: { id: { in: [...enteringExpiringSoonIds] } }, data: { status: "EXPIRING_SOON" } });
        }
        if (expiredIds.size > 0) {
          await tx.licensePermit.updateMany({ where: { id: { in: [...expiredIds] } }, data: { status: "EXPIRED" } });
        }
        // 3 kolom idempotency TERPISAH (bukan updateMany tunggal) — tiap
        // tier bisa punya himpunan license_id BERBEDA dalam satu scan pass.
        for (const tier of [90, 30, 7] as const) {
          const idsForTier = reminderTiersDue.filter((d) => d.tier === tier).map((d) => d.licenseId);
          if (idsForTier.length > 0) {
            await tx.licensePermit.updateMany({ where: { id: { in: idsForTier } }, data: { [TIER_COLUMN[tier]]: now } });
          }
        }

        this.logger.event("info", "license-expiry-scan: transisi/reminder diproses", {
          module: "regulatory-compliance",
          action: "license-expiry-scan.processed",
          tenant_id: tenantId,
          entering_expiring_soon_count: enteringExpiringSoonIds.size,
          expired_count: expiredIds.size,
          reminder_tier_count: reminderTiersDue.length,
        });

        if (expiredIds.size === 0 && reminderTiersDue.length === 0) return [];

        // PRD §8 baris 1/2 — "Responsible user" dibaca sbg holder_reference_id
        // KETIKA holder_type=INDIVIDUAL (skema §5 TIDAK py kolom
        // responsible_user_id terpisah pada licenses_permits, gap TDD §26)
        // — HSE Manager SELALU disertakan utk kedua event. "Top Management"
        // (baris 2) TIDAK dinotifikasi — TIDAK ADA role baseline utk itu
        // (keputusan SAMA dgn task 92, seed-rbac-baseline.ts banner comment).
        const hseManagers = await tx.user.findMany({
          where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
          select: { id: true },
        });
        const hseManagerIds = hseManagers.map((m) => m.id);

        const byId = new Map(licenses.map((l) => [l.id, l]));
        const results: Array<{
          licenseId: string;
          recipientUserIds: string[];
          eventType: string;
          priority: "HIGH" | "MEDIUM";
          variables: Record<string, string>;
        }> = [];

        for (const licenseId of expiredIds) {
          const license = byId.get(licenseId)!;
          const recipients = new Set(hseManagerIds);
          results.push({
            licenseId,
            recipientUserIds: [...recipients],
            eventType: "LICENSE_EXPIRED",
            priority: "HIGH",
            variables: { licenseName: license.licenseName, expiryDate: license.expiryDate?.toISOString().slice(0, 10) ?? "" },
          });
        }

        const tiersByLicense = new Map<string, ExpiryReminderTier[]>();
        for (const due of reminderTiersDue) {
          const list = tiersByLicense.get(due.licenseId) ?? [];
          list.push(due.tier);
          tiersByLicense.set(due.licenseId, list);
        }
        for (const [licenseId, tiers] of tiersByLicense) {
          const license = byId.get(licenseId)!;
          const recipients = new Set(hseManagerIds);
          if (license.holderType === "INDIVIDUAL" && license.holderReferenceId) {
            recipients.add(license.holderReferenceId);
          }
          results.push({
            licenseId,
            recipientUserIds: [...recipients],
            eventType: "LICENSE_EXPIRY_REMINDER",
            priority: "MEDIUM",
            variables: {
              licenseName: license.licenseName,
              expiryDate: license.expiryDate?.toISOString().slice(0, 10) ?? "",
              daysRemaining: String(Math.min(...tiers)),
            },
          });
        }

        return results;
      }),
    );

    for (const n of notifications) {
      for (const recipientUserId of n.recipientUserIds) {
        await tenantContextStorage.run({ tenantId }, () =>
          this.notificationService.enqueue({
            eventType: n.eventType,
            entityType: "LICENSE_PERMIT",
            entityId: n.licenseId,
            recipientUserId,
            priority: n.priority,
            eventCategory: "COMPLIANCE",
            variables: n.variables,
          }),
        );
      }
    }
  }
}
