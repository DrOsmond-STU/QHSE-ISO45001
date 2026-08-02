import { ModuleEntitlement, SubscriptionPlan } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
export interface OverrideEntitlementInput {
    tenantId: string;
    moduleCode: string;
    isEnabled: boolean;
    overrideReason: string;
}
export declare class EntitlementService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    /** BR-01 — dipanggil ProvisioningService SETELAH tenant context di-set ke
     * tenant BARU: insert satu module_entitlements row (is_enabled:true) per
     * module_code di plan.includedModuleCodes. Modul yang TIDAK termasuk plan
     * SENGAJA TIDAK dapat baris false eksplisit — "row tidak ada" itu
     * sendiri berarti "tidak entitled" (lihat isModuleEnabledForTenant()),
     * PRD literal: "sistem otomatis MENGAKTIFKAN module_entitlements sesuai
     * plan" (bukan "membuat baris utk seluruh modul, sebagian true sebagian
     * false"). */
    activateFromPlan(tenantId: string, plan: SubscriptionPlan): Promise<void>;
    /** BR-04 — HANYA Super Admin Platform boleh override entitlement di luar
     * batas default plan. Otorisasi PERMISSION-LEVEL (`sysadmin.entitlement.override`,
     * PRD Modul 31 §3) — method ini TIDAK mengecek role secara langsung
     * (bukan tanggung jawabnya, pola sama seluruh service lain di codebase
     * ini yang mengandalkan PermissionGuard/EntitlementGuard di layer HTTP
     * begitu controller-nya ada), murni menegakkan BENTUK data (upsert by
     * tenantId+moduleCode) + audit trail (overriddenBy wajib terisi dari
     * actor). */
    override(input: OverrideEntitlementInput): Promise<ModuleEntitlement>;
}
