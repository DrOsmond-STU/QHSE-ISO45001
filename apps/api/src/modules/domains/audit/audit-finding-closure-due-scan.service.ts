import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { AuditFindingClosureDueCandidate, findFindingsClosureDue } from "./audit-finding-closure-due-scan";

/**
 * TDD §13.1/§9 pola job cross-tenant. PRD §8 "Tenggat closure NC mendekat |
 * PIC CAPA terkait, Audit Program Owner" — Modul 10 (CAPA, task 4.2) BELUM
 * ADA, jadi TIDAK ADA "PIC CAPA" genuinely tersimpan di mana pun (gap TDD
 * §26) — disubstitusi audits.lead_auditor_id (kandidat paling plausible
 * yang TAHU status temuan sebelum CAPA formal ada) + HSE_MANAGER tenant-wide
 * (Audit Program Owner stand-in, pola sama seluruh modul lain).
 */
@Injectable()
export class AuditFindingClosureDueScanService implements OnModuleDestroy {
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
      SELECT DISTINCT tenant_id FROM audit_findings WHERE status != 'CLOSED' AND target_closure_date IS NOT NULL
    `;

    for (const row of rows) {
      try {
        await this.scanForTenant(row.tenant_id, now);
      } catch (err) {
        this.logger.event("error", "audit-finding-closure-due-scan gagal untuk satu tenant", {
          module: "audit",
          action: "audit-finding-closure-due-scan.tenant-failed",
          tenant_id: row.tenant_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async scanForTenant(tenantId: string, now: Date): Promise<void> {
    const notifications = await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx) => {
        const findings = await tx.auditFinding.findMany({
          where: { status: { not: "CLOSED" }, targetClosureDate: { not: null }, deletedAt: null },
          select: { id: true, findingNumber: true, status: true, targetClosureDate: true, auditId: true },
        });
        if (findings.length === 0) return [];

        const candidates: AuditFindingClosureDueCandidate[] = findings.map((f) => ({
          auditFindingId: f.id,
          status: f.status,
          targetClosureDate: f.targetClosureDate,
        }));
        const dueIds = new Set(findFindingsClosureDue(candidates, now).map((c) => c.auditFindingId));
        if (dueIds.size === 0) return [];

        this.logger.event("info", "audit-finding-closure-due-scan: reminder diproses", {
          module: "audit",
          action: "audit-finding-closure-due-scan.processed",
          tenant_id: tenantId,
          due_count: dueIds.size,
        });

        const hseManagers = await tx.user.findMany({
          where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
          select: { id: true },
        });
        const hseManagerIds = hseManagers.map((m) => m.id);

        const byId = new Map(findings.map((f) => [f.id, f]));
        const auditIds = [...new Set([...dueIds].map((id) => byId.get(id)!.auditId))];
        const audits = await tx.audit.findMany({ where: { id: { in: auditIds } }, select: { id: true, leadAuditorId: true, auditNumber: true } });
        const auditById = new Map(audits.map((a) => [a.id, a]));

        return [...dueIds].map((auditFindingId) => {
          const finding = byId.get(auditFindingId)!;
          const audit = auditById.get(finding.auditId)!;
          return {
            auditFindingId,
            recipientUserIds: [...new Set([audit.leadAuditorId, ...hseManagerIds])],
            variables: {
              findingNumber: finding.findingNumber,
              auditNumber: audit.auditNumber,
              targetClosureDate: finding.targetClosureDate?.toISOString().slice(0, 10) ?? "",
            },
          };
        });
      }),
    );

    for (const n of notifications) {
      for (const recipientUserId of n.recipientUserIds) {
        await tenantContextStorage.run({ tenantId }, () =>
          this.notificationService.enqueue({
            eventType: "AUDIT_FINDING_CLOSURE_DUE",
            entityType: "AUDIT_FINDING",
            entityId: n.auditFindingId,
            recipientUserId,
            priority: "HIGH",
            eventCategory: "AUDIT",
            variables: n.variables,
          }),
        );
      }
    }
  }
}
