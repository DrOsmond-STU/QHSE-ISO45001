import { ScopeType } from "@prisma/client";
import { PermissionCache } from "./permission-cache.interface";
import { PermissionRepository } from "./permission-repository.interface";
import { ScopeContext, ScopedIdsResult } from "./permission-resolution";
import { ScopeHierarchyResolver } from "./scope-hierarchy-resolver.interface";
export declare class PermissionService {
    private readonly cache;
    private readonly repository;
    private readonly hierarchyResolver;
    private readonly logger;
    constructor(cache: PermissionCache, repository: PermissionRepository, hierarchyResolver: ScopeHierarchyResolver);
    /**
     * Task 1.1 — resolusi hierarki (ScopeHierarchyResolver, DB) HANYA
     * dipanggil kalau baseline exact-match-or-TENANT (0.8) belum memutuskan
     * `true` DAN ada assignment di level lebih tinggi yang SECARA TEORITIS
     * bisa mengubah hasil — menghindari round-trip DB tambahan di jalur
     * paling umum (tidak punya permission sama sekali, atau sudah exact
     * match/TENANT).
     */
    hasPermission(userId: string, tenantId: string, permissionCode: string, scopeContext?: ScopeContext): Promise<boolean>;
    userHasRole(userId: string, tenantId: string, roleCode: string): Promise<boolean>;
    getScopedIds(userId: string, tenantId: string, scopeType: ScopeType): Promise<ScopedIdsResult>;
    invalidateCache(userId: string): Promise<void>;
    /** Dipanggil listener saat role_permissions berubah — belum ada consumer
     * (butuh daftar user per role, ditunda ke task 1.3 saat role-admin CRUD
     * ada). Untuk sekarang hanya placeholder no-op yang aman dipanggil. */
    invalidateForRole(_roleId: string, _tenantId: string): Promise<void>;
    private resolve;
}
