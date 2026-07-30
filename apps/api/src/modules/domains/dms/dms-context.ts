import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getCurrentTenantId, getCurrentUserId } from "../../../platform/tenancy/tenant-context";

// Duplikat kecil (BUKAN impor lintas domain) — pola sama seluruh modul
// domain lain di codebase ini (gap TDD §26 poin 29, task 1.2), menghindari
// circular import utk 2 fungsi generik yang tidak spesifik ke satu domain.

export function requireActorUserId(): string {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error("Actor user_id tidak ditemukan di context — operasi DMS ditolak (fail closed).");
  }
  return userId;
}

export function requireTenantId(): string {
  const tenantId = getCurrentTenantId();
  if (!tenantId) {
    throw new Error("Tenant context tidak ditemukan — operasi DMS ditolak (fail closed).");
  }
  return tenantId;
}

/** BR-02 (Modul 03 §6, mis. document_categories unik per tenant) ditegakkan
 * lewat unique index DB (schema.prisma) — helper ini cuma menerjemahkan
 * P2002 jadi error yang jelas maksudnya, bukan constraint tambahan di sini. */
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
