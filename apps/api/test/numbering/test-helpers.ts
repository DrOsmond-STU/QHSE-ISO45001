import { NumberingConfig, NumberingResetPeriod, NumberingScopeLevel } from "@prisma/client";
import { adminPrisma } from "../auth/test-helpers";

export { adminPrisma, createTestApp, finishTestApp, testingModuleBuilder, seedTenantFixture } from "../auth/test-helpers";
export type { TenantFixture } from "../auth/test-helpers";

export interface SeedNumberingConfigOptions {
  moduleCode?: string;
  pattern?: string;
  prefix?: string;
  resetPeriod?: NumberingResetPeriod;
  scopeLevel?: NumberingScopeLevel;
  scopeId?: string | null;
  lastSequence?: number;
  lastPeriodKey?: string | null;
}

/** Config authoring (Modul 31, belum ada) TIDAK jadi cakupan task 0.10 —
 * seed langsung lewat Prisma mentah, pola sama dgn
 * test/workflow-engine/test-helpers.ts men-seed workflow_definitions
 * langsung tanpa "builder service". */
export async function seedNumberingConfig(tenantId: string, options: SeedNumberingConfigOptions = {}): Promise<NumberingConfig> {
  return adminPrisma.numberingConfig.create({
    data: {
      tenantId,
      moduleCode: options.moduleCode ?? "TEST_MODULE",
      pattern: options.pattern ?? "{PREFIX}/{YYYY}/{SEQ:4}",
      prefix: options.prefix ?? "TST",
      resetPeriod: options.resetPeriod ?? "NEVER",
      scopeLevel: options.scopeLevel ?? "TENANT",
      scopeId: options.scopeId ?? null,
      lastSequence: options.lastSequence ?? 0,
      lastPeriodKey: options.lastPeriodKey ?? null,
    },
  });
}
