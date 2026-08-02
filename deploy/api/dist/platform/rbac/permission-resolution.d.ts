import { ScopeType } from "@prisma/client";
import { ScopeAncestors } from "./scope-hierarchy";
export interface ResolvedRoleAssignment {
    roleId: string;
    roleCode: string;
    scopeType: ScopeType;
    scopeId: string | null;
    permissionCodes: string[];
}
export interface ScopeContext {
    scopeType: ScopeType;
    scopeId: string;
}
export type ScopedIdsResult = {
    unrestricted: true;
} | {
    unrestricted: false;
    ids: string[];
};
/**
 * Master PRD §8.3: TENANT scope selalu memenuhi scope apa pun yang diminta
 * (akses lintas hierarki); exact-match scopeType+scopeId juga selalu
 * memenuhi. Sejak task 1.1: assignment di level LEBIH TINGGI dari
 * scopeContext yang diminta JUGA memenuhi kalau scopeContext adalah
 * turunannya ("HSE Officer scope Site X melihat Site X dan
 * turunannya/Department di bawahnya") — dibuktikan lewat `targetAncestors`
 * (ancestor chain scopeContext, diresolusi PermissionService via
 * ScopeHierarchyResolver SEBELUM memanggil fungsi pure ini). Kalau
 * targetAncestors tidak disuplai (mis. dipanggil tanpa hierarki tersedia,
 * atau entity scopeContext tidak ditemukan — fail closed, lihat
 * scopeCovers()), fallback ke baseline 0.8 (exact-match-or-TENANT) —
 * PERILAKU TIDAK PERNAH lebih longgar dari sebelumnya, hanya lebih sempit
 * atau sama.
 */
export declare function evaluatePermission(assignments: ResolvedRoleAssignment[], permissionCode: string, scopeContext?: ScopeContext, targetAncestors?: ScopeAncestors): boolean;
export declare function evaluateUserHasRole(assignments: ResolvedRoleAssignment[], roleCode: string): boolean;
/**
 * Data-scoping primitive (Master PRD §8.3 / TDD §8.2 "query filter otomatis
 * di repository layer"). Caller (future domain repository) menyusun
 * `WHERE site_id IN (:ids)` dari hasil ini — WAJIB perlakukan
 * `{unrestricted:false, ids:[]}` sebagai DENY-ALL (kembalikan 0 baris),
 * BUKAN mengeksekusi `WHERE x IN ()` (SQL valid tapi gampang salah kaprah
 * dikira "tidak ada filter").
 *
 * `descendantIdsByAssignment` (task 1.1) — map opsional `"{scopeType}:
 * {scopeId}" -> id[]` HASIL RESOLUSI SEBELUMNYA (PermissionService, via
 * ScopeHierarchyResolver.resolveDescendantIds) untuk tiap assignment yang
 * levelnya LEBIH TINGGI dari `scopeType` diminta — fungsi ini TETAP pure/
 * sync, tidak pernah panggil DB sendiri. Tanpa map ini (backward compat),
 * assignment di level lebih tinggi TIDAK berkontribusi (baseline 0.8).
 */
export declare function evaluateScopedIds(assignments: ResolvedRoleAssignment[], scopeType: ScopeType, descendantIdsByAssignment?: Map<string, string[]>): ScopedIdsResult;
