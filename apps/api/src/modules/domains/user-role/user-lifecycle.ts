import { UserStatus, UserType } from "@prisma/client";

export class UserLifecycleError extends Error {}

// PRD Modul 02 §6 BR-02 — "Transisi status users yang diizinkan:
// INVITED->ACTIVE, ACTIVE<->SUSPENDED, (ACTIVE|SUSPENDED)->DEACTIVATED."
// DEACTIVATED bersifat terminal SECARA DEFAULT — reaktivasi (rehire) PRD
// sebut butuh "proses eksplisit Reaktivasi User", tapi bentuknya sendiri
// TIDAK ditentukan (Modul 02 §13 Open Question #3, belum dijawab) — TIDAK
// diimplementasikan di sini (menebak mekanismenya berisiko salah, gap
// TDD §26), bukan oversight.
const ALLOWED_TRANSITIONS: Record<UserStatus, ReadonlySet<UserStatus>> = {
  INVITED: new Set<UserStatus>(["ACTIVE"]),
  ACTIVE: new Set<UserStatus>(["SUSPENDED", "DEACTIVATED"]),
  SUSPENDED: new Set<UserStatus>(["ACTIVE", "DEACTIVATED"]),
  DEACTIVATED: new Set<UserStatus>([]),
};

export function validateUserStatusTransition(from: UserStatus, to: UserStatus): void {
  if (!ALLOWED_TRANSITIONS[from].has(to)) {
    throw new UserLifecycleError(`BR-02: transisi status user dari ${from} ke ${to} tidak diizinkan.`);
  }
}

// PRD Modul 02 §6 BR-11 — "users.tenant_id hanya boleh NULL jika
// user_type = PLATFORM_ADMIN; seluruh tipe user lain wajib tenant_id
// terisi." Cuma satu arah (non-PLATFORM_ADMIN WAJIB ada tenant) — PRD
// TIDAK melarang PLATFORM_ADMIN tetap punya tenant_id terisi, jadi arah
// itu TIDAK divalidasi di sini.
export function validateTenantIdForUserType(userType: UserType, tenantId: string | null): void {
  if (userType !== "PLATFORM_ADMIN" && !tenantId) {
    throw new UserLifecycleError("BR-11: tenant_id wajib terisi untuk user_type selain PLATFORM_ADMIN.");
  }
}
