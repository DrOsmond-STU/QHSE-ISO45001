import { Injectable } from "@nestjs/common";
import { UsageCounter } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";

// Task 1.5 (Modul 31 §5) — usage_counters, snapshot berkala. Dipanggil
// dalam context tenant tertentu (tenantContextStorage.run(), pola sama
// reminder-scan/delegation-scan) oleh usage-counter-scan job.
@Injectable()
export class UsageCounterService {
  constructor(private readonly prisma: PrismaService) {}

  /** ACTIVE_USERS/ACTIVE_SITES — literal PRD §5 (2 metric_type). count()
   * murni menghitung ULANG saat ini (bukan increment/decrement stateful) —
   * snapshot independen tiap panggilan, pola sama semangat
   * system_audit_logs (fakta pada satu titik waktu). */
  async snapshot(tenantId: string): Promise<UsageCounter[]> {
    return this.prisma.withRls(async (tx) => {
      const [activeUserCount, activeSiteCount] = await Promise.all([
        tx.user.count({ where: { tenantId, status: "ACTIVE" } }),
        tx.site.count({ where: { tenantId, status: "ACTIVE" } }),
      ]);

      return Promise.all([
        tx.usageCounter.create({ data: { tenantId, metricType: "ACTIVE_USERS", currentValue: activeUserCount } }),
        tx.usageCounter.create({ data: { tenantId, metricType: "ACTIVE_SITES", currentValue: activeSiteCount } }),
      ]);
    });
  }

  async latestForTenant(tenantId: string): Promise<UsageCounter[]> {
    return this.prisma.withRls(async (tx) => {
      const [latestUsers, latestSites] = await Promise.all([
        tx.usageCounter.findFirst({ where: { tenantId, metricType: "ACTIVE_USERS" }, orderBy: { measuredAt: "desc" } }),
        tx.usageCounter.findFirst({ where: { tenantId, metricType: "ACTIVE_SITES" }, orderBy: { measuredAt: "desc" } }),
      ]);
      return [latestUsers, latestSites].filter((c): c is UsageCounter => c !== null);
    });
  }
}
