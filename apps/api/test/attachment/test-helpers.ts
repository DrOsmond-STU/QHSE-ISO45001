import { randomUUID } from "node:crypto";
import { adminPrisma } from "../auth/test-helpers";

export { adminPrisma, createTestApp, finishTestApp, testingModuleBuilder, seedTenantFixture } from "../auth/test-helpers";
export type { TenantFixture } from "../auth/test-helpers";

export interface SeededUser {
  id: string;
  email: string;
}

export async function seedUserInTenant(tenantId: string, label = "Test User"): Promise<SeededUser> {
  const email = `${label.toLowerCase().replace(/\s+/g, "-")}-${randomUUID()}@qhse.local`;
  const user = await adminPrisma.user.create({
    data: { tenantId, email, fullName: label, status: "ACTIVE" },
  });
  return { id: user.id, email: user.email };
}
