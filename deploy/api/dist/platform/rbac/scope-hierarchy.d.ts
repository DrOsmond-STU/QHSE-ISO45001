import { ScopeType } from "@prisma/client";
export declare const SCOPE_LEVEL_ORDER: Record<ScopeType, number>;
/** Hasil resolusi ancestor chain SATU entity (level manapun) — field yang
 * relevan terisi tergantung sedalam apa entity-nya (mis. entity level SITE
 * mengisi companyId+branchId+siteId, TIDAK departmentId). */
export interface ScopeAncestors {
    tenantId: string;
    companyId?: string;
    branchId?: string;
    siteId?: string;
    departmentId?: string;
}
/**
 * Pure/sync — dipanggil setelah ancestor chain target (kalau ada) DIRESOLUSI
 * TERLEBIH DAHULU oleh caller (DB access ada di
 * PrismaScopeHierarchyResolver, bukan di sini). Kalau targetAncestors tidak
 * disuplai (mis. entity target tidak ditemukan — fail closed, BUKAN
 * throw — lihat prisma-scope-hierarchy.resolver.ts), fallback ke baseline
 * 0.8 (exact-match-or-TENANT) — TIDAK PERNAH lebih longgar dari sebelumnya,
 * hanya lebih sempit-atau-sama.
 */
export declare function scopeCovers(assignment: {
    scopeType: ScopeType;
    scopeId: string | null;
}, target: {
    scopeType: ScopeType;
    scopeId: string;
}, targetAncestors?: ScopeAncestors): boolean;
