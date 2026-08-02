"use strict";
// Pure/sync business rules — dipanggil DelegationOfAuthorityService/
// delegation-scan.ts SETELAH baca kandidat dari DB, caller yang tulis
// hasilnya. Pola sama site-lifecycle.ts (1.1) / workflow-sla-scan.ts (0.9).
Object.defineProperty(exports, "__esModule", { value: true });
exports.DelegationOverlapError = void 0;
exports.assertNoDelegationOverlap = assertNoDelegationOverlap;
exports.findDelegationsToActivate = findDelegationsToActivate;
exports.findDelegationsToExpire = findDelegationsToExpire;
class DelegationOverlapError extends Error {
}
exports.DelegationOverlapError = DelegationOverlapError;
/**
 * BR-07 (PRD Modul 02 §6) — "delegation_of_authority tidak boleh overlap
 * tanggal untuk kombinasi (delegator_user_id, role_id, scope_type,
 * scope_id) yang sama." Caller (DelegationOfAuthorityService) WAJIB sudah
 * memfilter existingDelegations ke kombinasi identitas yang SAMA
 * (delegator/role/scope) DAN status yang masih relevan (SCHEDULED/ACTIVE
 * — EXPIRED/CANCELLED/REVOKED tidak lagi menghalangi overlap baru,
 * riwayatnya boleh tumpang tindih dgn delegasi baru) — fungsi ini murni
 * bandingkan rentang tanggal. Overlap standar rentang tertutup [a,b]
 * vs [c,d]: overlap jika a<=d DAN c<=b.
 */
function assertNoDelegationOverlap(newRange, existingDelegations) {
    for (const existing of existingDelegations) {
        if (newRange.dateFrom.getTime() <= existing.dateTo.getTime() && existing.dateFrom.getTime() <= newRange.dateTo.getTime()) {
            throw new DelegationOverlapError(`BR-07: rentang tanggal ${newRange.dateFrom.toISOString().slice(0, 10)}..${newRange.dateTo.toISOString().slice(0, 10)} tumpang tindih dengan delegasi existing ${existing.dateFrom.toISOString().slice(0, 10)}..${existing.dateTo.toISOString().slice(0, 10)}.`);
        }
    }
}
/** PRD Modul 02 §4.3 poin 3 — "saat date_from tercapai (scheduled job
 * harian), status -> ACTIVE." Natural-key idempotency otomatis (delegasi
 * yang SUDAH ACTIVE tidak lagi masuk kandidat query berikutnya, caller
 * filter status=SCHEDULED — pola sama findOverdueSites 1.1). */
function findDelegationsToActivate(candidates, now) {
    return candidates.filter((c) => c.dateFrom.getTime() <= now.getTime());
}
/** PRD Modul 02 §4.3 poin 4 — "saat date_to terlewati, status -> EXPIRED."
 * caller filter status=ACTIVE (natural-key idempotency, pola sama di atas). */
function findDelegationsToExpire(candidates, now) {
    return candidates.filter((c) => c.dateTo.getTime() < now.getTime());
}
