import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import {
  AuditorCompetencyExpiryCandidate,
  findCompetencyRecordsApproachingExpiry,
  findExpiredCompetencyRecords,
} from "./auditor-competency-expiry-scan";

/**
 * TDD §13.1/§9 pola job cross-tenant (sama persis LicenseExpiryScanService
 * 2.2, versi lebih sederhana — TANPA tier reminder krn auditor_competency_records
 * tidak punya kolom idempotency, lihat banner comment auditor-competency-
 * expiry-scan.ts). PRD §8 "Kompetensi auditor akan kedaluwarsa | Auditor
 * terkait, Tenant Admin" — Auditor terkait = competency_records.user_id
 * sendiri, "Tenant Admin" dibaca literal role TENANT_ADMIN (BEDA dari
 * pemetaan "Tenant Admin/HR" -> TENANT_ADMIN di RBAC, di sini PRD §8
 * SUDAH eksplisit sebut "Tenant Admin" tanpa "/HR", jadi tanpa interpretasi
 * tambahan).
 */
@Injectable()
export class AuditorCompetencyExpiryScanService implements OnModuleDestroy {
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
      SELECT DISTINCT tenant_id FROM auditor_competency_records WHERE status = 'ACTIVE'
    `;

    for (const row of rows) {
      try {
        await this.scanForTenant(row.tenant_id, now);
      } catch (err) {
        this.logger.event("error", "auditor-competency-expiry-scan gagal untuk satu tenant", {
          module: "audit",
          action: "auditor-competency-expiry-scan.tenant-failed",
          tenant_id: row.tenant_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async scanForTenant(tenantId: string, now: Date): Promise<void> {
    const notifications = await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx) => {
        const records = await tx.auditorCompetencyRecord.findMany({
          where: { status: "ACTIVE", deletedAt: null },
          select: { id: true, userId: true, standardScope: true, status: true, expiryDate: true },
        });
        if (records.length === 0) return [];

        const candidates: AuditorCompetencyExpiryCandidate[] = records.map((r) => ({
          competencyRecordId: r.id,
          status: r.status,
          expiryDate: r.expiryDate,
        }));
        const expiredIds = new Set(findExpiredCompetencyRecords(candidates, now).map((c) => c.competencyRecordId));
        const approachingIds = new Set(findCompetencyRecordsApproachingExpiry(candidates, now).map((c) => c.competencyRecordId));

        if (expiredIds.size > 0) {
          await tx.auditorCompetencyRecord.updateMany({ where: { id: { in: [...expiredIds] } }, data: { status: "EXPIRED" } });
        }

        this.logger.event("info", "auditor-competency-expiry-scan: transisi/reminder diproses", {
          module: "audit",
          action: "auditor-competency-expiry-scan.processed",
          tenant_id: tenantId,
          expired_count: expiredIds.size,
          approaching_count: approachingIds.size,
        });

        if (expiredIds.size === 0 && approachingIds.size === 0) return [];

        const tenantAdmins = await tx.user.findMany({
          where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "TENANT_ADMIN" } } } },
          select: { id: true },
        });
        const tenantAdminIds = tenantAdmins.map((a) => a.id);

        const byId = new Map(records.map((r) => [r.id, r]));
        const results: Array<{
          competencyRecordId: string;
          recipientUserIds: string[];
          eventType: string;
          priority: "HIGH" | "MEDIUM";
          variables: Record<string, string>;
        }> = [];

        for (const competencyRecordId of expiredIds) {
          const record = byId.get(competencyRecordId)!;
          results.push({
            competencyRecordId,
            recipientUserIds: [...new Set([record.userId, ...tenantAdminIds])],
            eventType: "AUDITOR_COMPETENCY_EXPIRED",
            priority: "HIGH",
            variables: { standardScope: record.standardScope, expiryDate: record.expiryDate?.toISOString().slice(0, 10) ?? "" },
          });
        }
        for (const competencyRecordId of approachingIds) {
          const record = byId.get(competencyRecordId)!;
          results.push({
            competencyRecordId,
            recipientUserIds: [...new Set([record.userId, ...tenantAdminIds])],
            eventType: "AUDITOR_COMPETENCY_EXPIRING_SOON",
            priority: "MEDIUM",
            variables: { standardScope: record.standardScope, expiryDate: record.expiryDate?.toISOString().slice(0, 10) ?? "" },
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
            entityType: "AUDITOR_COMPETENCY_RECORD",
            entityId: n.competencyRecordId,
            recipientUserId,
            priority: n.priority,
            eventCategory: "AUDIT",
            variables: n.variables,
          }),
        );
      }
    }
  }
}
