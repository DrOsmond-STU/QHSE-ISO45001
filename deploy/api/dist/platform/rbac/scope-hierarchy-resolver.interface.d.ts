import { ScopeType } from "@prisma/client";
import { ScopeAncestors } from "./scope-hierarchy";
export interface ScopeHierarchyResolver {
    /** Ancestor chain SATU entity, atau undefined kalau entity-nya tidak
     * ditemukan (fail closed di pemanggil — BUKAN throw, lihat scopeCovers()). */
    resolveAncestors(tenantId: string, scopeType: ScopeType, scopeId: string): Promise<ScopeAncestors | undefined>;
    /** Seluruh id di level `targetLevel` yang berada di bawah (scopeType,scopeId). */
    resolveDescendantIds(tenantId: string, scopeType: ScopeType, scopeId: string, targetLevel: ScopeType): Promise<string[]>;
}
export declare const SCOPE_HIERARCHY_RESOLVER: unique symbol;
