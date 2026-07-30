import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AppLoggerService } from "../../../../platform/observability/app-logger.service";
import { tenantContextStorage } from "../../../../platform/tenancy/tenant-context";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { checkQuota } from "./usage-quota";
import { UsageCounterService } from "./usage-counter.service";

interface TenantQuota {
  maxUsers: number | null;
  maxSites: number | null;
}

// TDD §13.1/§9 — pola job cross-tenant PERSIS reminder-scan (1.1)/
// delegation-scan (1.4). BR-02 (PRD Modul 31 §6): snapshot harian
// ACTIVE_USERS/ACTIVE_SITES, deteksi pelanggaran kuota TIDAK memblokir
// operasional — cuma LOG (notifikasi ke Tenant Admin/Super Admin Platform
// SENGAJA belum di-wire, gap TDD §26, pola konsisten seluruh task 1.1-1.4).
//
// Temuan operasional: bootstrap query AWALNYA `SELECT tenant_id FROM
// tenants` (SEMUA tenant tanpa filter) — timeout (>20s) begitu dijalankan
// bareng full test suite, krn DB dev lokal bersama sudah mengakumulasi
// ribuan baris tenants dari fixture Jest lintas SEMUA task 0.1-1.5 yang
// tidak pernah dibersihkan (pola sama gap TDD §26 poin 22, kasus 1,579
// baris users task 1.1). Diperbaiki mengikuti pola reminder-scan/
// delegation-scan/workflow-sla-scan yang SUDAH benar sejak awal: filter DI
// query bootstrap itu sendiri (tenant_subscriptions berstatus
// TRIAL/ACTIVE saja — jauh lebih sedikit drpd SELURUH tenants), bukan
// iterasi semua lalu filter di dalam loop. Sekalian JOIN subscription_plans
// di query yang sama supaya tidak perlu query kuota terpisah per tenant.
@Injectable()
export class UsageCounterScanService implements OnModuleDestroy {
  private readonly adminPrisma: PrismaClient;

  constructor(
    private readonly usageCounterService: UsageCounterService,
    private readonly logger: AppLoggerService,
  ) {
    this.adminPrisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  }

  async onModuleDestroy(): Promise<void> {
    await this.adminPrisma.$disconnect();
  }

  async scan(): Promise<void> {
    const rows = await this.adminPrisma.$queryRaw<
      Array<{ tenant_id: string; max_users: number | null; max_sites: number | null }>
    >`
      SELECT DISTINCT ON (ts.tenant_id) ts.tenant_id, sp.max_users, sp.max_sites
      FROM tenant_subscriptions ts
      JOIN subscription_plans sp ON sp.subscription_plan_id = ts.subscription_plan_id
      WHERE ts.status IN ('TRIAL', 'ACTIVE')
      ORDER BY ts.tenant_id, ts.created_at DESC
    `;

    for (const row of rows) {
      try {
        await this.scanForTenant(row.tenant_id, { maxUsers: row.max_users, maxSites: row.max_sites });
      } catch (err) {
        this.logger.event("error", "usage-counter-scan gagal untuk satu tenant", {
          module: "system-administration",
          action: "usage-counter-scan.tenant-failed",
          tenant_id: row.tenant_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async scanForTenant(tenantId: string, quota: TenantQuota): Promise<void> {
    await tenantContextStorage.run({ tenantId }, async () => {
      const counters = await this.usageCounterService.snapshot(tenantId);

      for (const counter of counters) {
        const maxValue = counter.metricType === "ACTIVE_USERS" ? quota.maxUsers : quota.maxSites;
        const result = checkQuota({ metricType: counter.metricType, currentValue: counter.currentValue, maxValue });
        if (result.exceeded) {
          this.logger.event("warn", "BR-02: pemakaian melebihi kuota plan (operasional TIDAK diblokir)", {
            module: "system-administration",
            action: "usage-counter-scan.quota-exceeded",
            tenant_id: tenantId,
            metric_type: result.metricType,
            current_value: result.currentValue,
            max_value: result.maxValue,
          });
        }
      }
    });
  }
}
