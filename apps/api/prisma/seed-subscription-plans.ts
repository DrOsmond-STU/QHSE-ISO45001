// Katalog subscription_plans BASELINE (task 1.5) — TDD §6.3 "data referensi
// non-tenant ... di-seed lewat migration terkontrol versi", pola sama
// seed-industry-templates.ts (1.2)/seed-rbac-baseline.ts (0.8): idempotent
// upsert, diekspor sbg fungsi (dipanggil test setup) + CLI.
//
// included_module_codes berisi "ORG"/"USER_MGMT"/"NOTIFICATION" utk KETIGA
// plan — hanya module_code yang benar-benar ada di codebase ini (Modul
// 01/02/25, task 1.1/1.3/1.7). Modul 03-24/26-31 (PRD) belum py kode/
// short-code module_code resmi sama sekali — mengarang short-code utk
// modul yang belum dibangun berisiko salah begitu modul itu benar-benar
// dikerjakan (gap TDD §26). NOTIFICATION ditambahkan task 1.7 (BUKAN
// modul bisnis opsional spt ORG/USER_MGMT bisa jadi kelak — PRD Modul 25
// §1 eksplisit "infrastruktur bersama ... dipakai oleh SELURUH 30 modul
// lain", jadi disertakan di SEMUA tier tanpa kecuali, tidak jadi
// diferensiator plan) — endpoint notification.* di-gate @RequirePermission
// (EntitlementGuard checks module_code dari situ), tanpa NOTIFICATION di
// includedModuleCodes tenant manapun yang SUDAH py tenant_subscriptions
// akan 403 "Modul tidak aktif" utk fitur yang seharusnya selalu tersedia.
// Diferensiasi 3 tier PRAKTIS hanya lewat max_users/max_sites utk
// sekarang; diferensiasi modul akan jadi bermakna begitu modul Phase 2+
// py module_code sungguhan.
//
// Jalankan CLI: pnpm --filter @qhse/api seed:subscription-plans
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

export interface SubscriptionPlanSeed {
  planName: string;
  includedModuleCodes: string[];
  maxUsers: number | null;
  maxSites: number | null;
}

export const SUBSCRIPTION_PLAN_SEEDS: readonly SubscriptionPlanSeed[] = [
  { planName: "Core", includedModuleCodes: ["ORG", "USER_MGMT", "NOTIFICATION", "DMS", "COMPLIANCE", "RISK", "WORK_PERMIT", "INCIDENT", "INSPECTION", "EMERGENCY_RESPONSE", "AUDIT", "CAPA", "QUALITY", "ENVIRONMENTAL", "OCCUPATIONAL_HEALTH", "ASSET_EQUIPMENT", "CALIBRATION", "CONTRACTOR"], maxUsers: 25, maxSites: 3 },
  { planName: "Standard", includedModuleCodes: ["ORG", "USER_MGMT", "NOTIFICATION", "DMS", "COMPLIANCE", "RISK", "WORK_PERMIT", "INCIDENT", "INSPECTION", "EMERGENCY_RESPONSE", "AUDIT", "CAPA", "QUALITY", "ENVIRONMENTAL", "OCCUPATIONAL_HEALTH", "ASSET_EQUIPMENT", "CALIBRATION", "CONTRACTOR"], maxUsers: 100, maxSites: 10 },
  { planName: "Enterprise", includedModuleCodes: ["ORG", "USER_MGMT", "NOTIFICATION", "DMS", "COMPLIANCE", "RISK", "WORK_PERMIT", "INCIDENT", "INSPECTION", "EMERGENCY_RESPONSE", "AUDIT", "CAPA", "QUALITY", "ENVIRONMENTAL", "OCCUPATIONAL_HEALTH", "ASSET_EQUIPMENT", "CALIBRATION", "CONTRACTOR"], maxUsers: null, maxSites: null },
];

// Task 1.7 — upsert SUNGGUHAN (update kolom katalog di baris yang SUDAH
// ada, bukan cuma create-if-missing spt versi 1.5) — ditemukan perlu
// begitu NOTIFICATION ditambahkan ke includedModuleCodes: baris "Core"/
// "Standard"/"Enterprise" SUDAH ada di DB dev dari seed run 1.5, "create
// if not exists" lama TIDAK PERNAH menyentuhnya lagi. Katalog baseline ini
// (beda dari mis. `permissions.description` yang kalau berubah tidak
// berdampak fungsional) PUNYA konsekuensi FUNGSIONAL langsung
// (EntitlementGuard) kalau tidak sinkron dgn definisi terbaru di kode.
export async function seedSubscriptionPlans(prisma: PrismaClient): Promise<void> {
  for (const seed of SUBSCRIPTION_PLAN_SEEDS) {
    const existing = await prisma.subscriptionPlan.findFirst({ where: { planName: seed.planName } });
    if (!existing) {
      await prisma.subscriptionPlan.create({
        data: {
          planName: seed.planName,
          includedModuleCodes: seed.includedModuleCodes,
          maxUsers: seed.maxUsers,
          maxSites: seed.maxSites,
          isActive: true,
        },
      });
    } else {
      await prisma.subscriptionPlan.update({
        where: { id: existing.id },
        data: { includedModuleCodes: seed.includedModuleCodes, maxUsers: seed.maxUsers, maxSites: seed.maxSites },
      });
    }
  }
}

async function main() {
  const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  await seedSubscriptionPlans(prisma);
  // eslint-disable-next-line no-console
  console.log(`subscription_plans baseline siap: ${SUBSCRIPTION_PLAN_SEEDS.map((s) => s.planName).join(", ")}.`);
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
