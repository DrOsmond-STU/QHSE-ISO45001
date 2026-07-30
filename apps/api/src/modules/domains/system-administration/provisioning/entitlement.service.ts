import { Injectable } from "@nestjs/common";
import { ModuleEntitlement, SubscriptionPlan } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { requireActorUserId } from "./system-administration-context";

export interface OverrideEntitlementInput {
  tenantId: string;
  moduleCode: string;
  isEnabled: boolean;
  overrideReason: string;
}

// Task 1.5 (Modul 31 §5/§6) — module_entitlements, tenant-scoped biasa.
@Injectable()
export class EntitlementService {
  constructor(private readonly prisma: PrismaService) {}

  /** BR-01 — dipanggil ProvisioningService SETELAH tenant context di-set ke
   * tenant BARU: insert satu module_entitlements row (is_enabled:true) per
   * module_code di plan.includedModuleCodes. Modul yang TIDAK termasuk plan
   * SENGAJA TIDAK dapat baris false eksplisit — "row tidak ada" itu
   * sendiri berarti "tidak entitled" (lihat isModuleEnabledForTenant()),
   * PRD literal: "sistem otomatis MENGAKTIFKAN module_entitlements sesuai
   * plan" (bukan "membuat baris utk seluruh modul, sebagian true sebagian
   * false"). */
  async activateFromPlan(tenantId: string, plan: SubscriptionPlan): Promise<void> {
    if (plan.includedModuleCodes.length === 0) return;
    await this.prisma.withRls((tx) =>
      tx.moduleEntitlement.createMany({
        data: plan.includedModuleCodes.map((moduleCode) => ({ tenantId, moduleCode, isEnabled: true })),
      }),
    );
  }

  /** BR-04 — HANYA Super Admin Platform boleh override entitlement di luar
   * batas default plan. Otorisasi PERMISSION-LEVEL (`sysadmin.entitlement.override`,
   * PRD Modul 31 §3) — method ini TIDAK mengecek role secara langsung
   * (bukan tanggung jawabnya, pola sama seluruh service lain di codebase
   * ini yang mengandalkan PermissionGuard/EntitlementGuard di layer HTTP
   * begitu controller-nya ada), murni menegakkan BENTUK data (upsert by
   * tenantId+moduleCode) + audit trail (overriddenBy wajib terisi dari
   * actor). */
  async override(input: OverrideEntitlementInput): Promise<ModuleEntitlement> {
    const overriddenBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.moduleEntitlement.upsert({
        where: { tenantId_moduleCode: { tenantId: input.tenantId, moduleCode: input.moduleCode } },
        create: {
          tenantId: input.tenantId,
          moduleCode: input.moduleCode,
          isEnabled: input.isEnabled,
          overrideReason: input.overrideReason,
          overriddenBy,
        },
        update: { isEnabled: input.isEnabled, overrideReason: input.overrideReason, overriddenBy },
      }),
    );
  }

  // Pengecekan BACA "apakah modul X aktif utk tenant Y" (dipakai
  // EntitlementGuard per request, BR-01) SENGAJA TIDAK ada di sini —
  // hidup di platform/entitlement/entitlement-check.service.ts, query
  // Prisma LANGSUNG ke module_entitlements/tenant_subscriptions, pola
  // PERSIS PrismaScopeHierarchyResolver (platform/rbac, task 1.1): guard
  // HTTP adalah platform/*, TIDAK BOLEH impor modul domain (arah modular
  // monolith terbalik) — lihat banner comment file itu.
}
