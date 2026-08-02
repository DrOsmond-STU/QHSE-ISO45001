export declare class DelegationOverlapError extends Error {
}
export interface DelegationDateRange {
    dateFrom: Date;
    dateTo: Date;
}
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
export declare function assertNoDelegationOverlap(newRange: DelegationDateRange, existingDelegations: readonly DelegationDateRange[]): void;
export interface ScheduledDelegationCandidate {
    delegationId: string;
    dateFrom: Date;
}
/** PRD Modul 02 §4.3 poin 3 — "saat date_from tercapai (scheduled job
 * harian), status -> ACTIVE." Natural-key idempotency otomatis (delegasi
 * yang SUDAH ACTIVE tidak lagi masuk kandidat query berikutnya, caller
 * filter status=SCHEDULED — pola sama findOverdueSites 1.1). */
export declare function findDelegationsToActivate(candidates: readonly ScheduledDelegationCandidate[], now: Date): ScheduledDelegationCandidate[];
export interface ActiveDelegationCandidate {
    delegationId: string;
    dateTo: Date;
}
/** PRD Modul 02 §4.3 poin 4 — "saat date_to terlewati, status -> EXPIRED."
 * caller filter status=ACTIVE (natural-key idempotency, pola sama di atas). */
export declare function findDelegationsToExpire(candidates: readonly ActiveDelegationCandidate[], now: Date): ActiveDelegationCandidate[];
