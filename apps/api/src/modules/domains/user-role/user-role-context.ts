import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getCurrentTenantId, getCurrentUserId } from "../../../platform/tenancy/tenant-context";

// Duplikat kecil (BUKAN impor dari organization/organization-context.ts) —
// pola sama seluruh modul lain di codebase ini (attachment/notification/
// numbering/workflow-engine masing-masing punya salinan lokal helper
// serupa, bukan shared import lintas modul domain) — menghindari coupling
// user-role<->organization utk 3 fungsi generik yang tidak spesifik ke
// salah satu domain.

export function requireActorUserId(): string {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error("Actor user_id tidak ditemukan di context — operasi tulis user/role ditolak (fail closed, sama pola dgn withRls()).");
  }
  return userId;
}

export function requireTenantId(): string {
  const tenantId = getCurrentTenantId();
  if (!tenantId) {
    throw new Error("Tenant context tidak ditemukan — operasi tulis user/role ditolak (fail closed).");
  }
  return tenantId;
}

export async function withCleanUniqueViolation<T>(fn: () => Promise<T>, message: string): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ConflictException(message);
    }
    throw err;
  }
}
