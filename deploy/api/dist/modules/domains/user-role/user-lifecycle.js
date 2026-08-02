"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserLifecycleError = void 0;
exports.validateUserStatusTransition = validateUserStatusTransition;
exports.validateTenantIdForUserType = validateTenantIdForUserType;
class UserLifecycleError extends Error {
}
exports.UserLifecycleError = UserLifecycleError;
// PRD Modul 02 §6 BR-02 — "Transisi status users yang diizinkan:
// INVITED->ACTIVE, ACTIVE<->SUSPENDED, (ACTIVE|SUSPENDED)->DEACTIVATED."
// DEACTIVATED bersifat terminal SECARA DEFAULT — reaktivasi (rehire) PRD
// sebut butuh "proses eksplisit Reaktivasi User", tapi bentuknya sendiri
// TIDAK ditentukan (Modul 02 §13 Open Question #3, belum dijawab) — TIDAK
// diimplementasikan di sini (menebak mekanismenya berisiko salah, gap
// TDD §26), bukan oversight.
const ALLOWED_TRANSITIONS = {
    INVITED: new Set(["ACTIVE"]),
    ACTIVE: new Set(["SUSPENDED", "DEACTIVATED"]),
    SUSPENDED: new Set(["ACTIVE", "DEACTIVATED"]),
    DEACTIVATED: new Set([]),
};
function validateUserStatusTransition(from, to) {
    if (!ALLOWED_TRANSITIONS[from].has(to)) {
        throw new UserLifecycleError(`BR-02: transisi status user dari ${from} ke ${to} tidak diizinkan.`);
    }
}
// PRD Modul 02 §6 BR-11 — "users.tenant_id hanya boleh NULL jika
// user_type = PLATFORM_ADMIN; seluruh tipe user lain wajib tenant_id
// terisi." Cuma satu arah (non-PLATFORM_ADMIN WAJIB ada tenant) — PRD
// TIDAK melarang PLATFORM_ADMIN tetap punya tenant_id terisi, jadi arah
// itu TIDAK divalidasi di sini.
function validateTenantIdForUserType(userType, tenantId) {
    if (userType !== "PLATFORM_ADMIN" && !tenantId) {
        throw new UserLifecycleError("BR-11: tenant_id wajib terisi untuk user_type selain PLATFORM_ADMIN.");
    }
}
//# sourceMappingURL=user-lifecycle.js.map