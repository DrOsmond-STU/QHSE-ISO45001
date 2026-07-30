import { Inject, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ScopeType } from "@prisma/client";
import { PERMISSION_CACHE_TTL_SECONDS } from "./rbac.constants";
import { PermissionCache, PERMISSION_CACHE } from "./permission-cache.interface";
import { PermissionRepository, PERMISSION_REPOSITORY } from "./permission-repository.interface";
import {
  evaluatePermission,
  evaluateScopedIds,
  evaluateUserHasRole,
  ResolvedRoleAssignment,
  ScopeContext,
  ScopedIdsResult,
} from "./permission-resolution";
import { SCOPE_LEVEL_ORDER } from "./scope-hierarchy";
import { ScopeHierarchyResolver, SCOPE_HIERARCHY_RESOLVER } from "./scope-hierarchy-resolver.interface";

// TDD §8.2 — PermissionService: resolusi user_roles -> role_permissions ->
// cek scope, fail closed (cache down -> DB; DB down -> 503, bukan bypass).
@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    @Inject(PERMISSION_CACHE) private readonly cache: PermissionCache,
    @Inject(PERMISSION_REPOSITORY) private readonly repository: PermissionRepository,
    @Inject(SCOPE_HIERARCHY_RESOLVER) private readonly hierarchyResolver: ScopeHierarchyResolver,
  ) {}

  /**
   * Task 1.1 — resolusi hierarki (ScopeHierarchyResolver, DB) HANYA
   * dipanggil kalau baseline exact-match-or-TENANT (0.8) belum memutuskan
   * `true` DAN ada assignment di level lebih tinggi yang SECARA TEORITIS
   * bisa mengubah hasil — menghindari round-trip DB tambahan di jalur
   * paling umum (tidak punya permission sama sekali, atau sudah exact
   * match/TENANT).
   */
  async hasPermission(userId: string, tenantId: string, permissionCode: string, scopeContext?: ScopeContext): Promise<boolean> {
    const assignments = await this.resolve(userId, tenantId);

    if (!scopeContext) {
      return evaluatePermission(assignments, permissionCode);
    }
    if (evaluatePermission(assignments, permissionCode, scopeContext)) {
      return true;
    }

    const matching = assignments.filter((a) => a.permissionCodes.includes(permissionCode));
    const needsHierarchy = matching.some(
      (a) => a.scopeId !== null && a.scopeType !== scopeContext.scopeType && SCOPE_LEVEL_ORDER[a.scopeType] < SCOPE_LEVEL_ORDER[scopeContext.scopeType],
    );
    if (!needsHierarchy) {
      return false;
    }

    const targetAncestors = await this.hierarchyResolver.resolveAncestors(tenantId, scopeContext.scopeType, scopeContext.scopeId);
    return evaluatePermission(assignments, permissionCode, scopeContext, targetAncestors);
  }

  async userHasRole(userId: string, tenantId: string, roleCode: string): Promise<boolean> {
    return evaluateUserHasRole(await this.resolve(userId, tenantId), roleCode);
  }

  async getScopedIds(userId: string, tenantId: string, scopeType: ScopeType): Promise<ScopedIdsResult> {
    const assignments = await this.resolve(userId, tenantId);
    if (assignments.some((a) => a.scopeType === "TENANT")) {
      return { unrestricted: true };
    }

    const higherAssignments = assignments.filter(
      (a) => a.scopeId !== null && a.scopeType !== scopeType && SCOPE_LEVEL_ORDER[a.scopeType] < SCOPE_LEVEL_ORDER[scopeType],
    );
    const resolved = await Promise.all(
      higherAssignments.map(async (a) => ({
        key: `${a.scopeType}:${a.scopeId}`,
        ids: await this.hierarchyResolver.resolveDescendantIds(tenantId, a.scopeType, a.scopeId as string, scopeType),
      })),
    );
    const descendantIdsByAssignment = new Map(resolved.map((r) => [r.key, r.ids]));

    return evaluateScopedIds(assignments, scopeType, descendantIdsByAssignment);
  }

  async invalidateCache(userId: string): Promise<void> {
    try {
      await this.cache.invalidate(userId);
    } catch (err) {
      this.logger.warn(`Gagal invalidasi permission cache untuk user ${userId}: ${err}`);
    }
  }

  /** Dipanggil listener saat role_permissions berubah — belum ada consumer
   * (butuh daftar user per role, ditunda ke task 1.3 saat role-admin CRUD
   * ada). Untuk sekarang hanya placeholder no-op yang aman dipanggil. */
  async invalidateForRole(_roleId: string, _tenantId: string): Promise<void> {
    // TODO(1.3): fan-out invalidateCache() ke seluruh userId pemegang roleId
    // ini begitu ada query "cari user by role" (butuh index/tabel tambahan).
    this.logger.debug(`invalidateForRole dipanggil untuk role ${_roleId} — belum ada fan-out (task 1.3).`);
  }

  private async resolve(userId: string, tenantId: string): Promise<ResolvedRoleAssignment[]> {
    try {
      const cached = await this.cache.get(userId);
      if (cached) {
        return cached;
      }
    } catch (err) {
      this.logger.warn(`Redis permission cache unavailable — fallback ke DB. ${err}`);
    }

    let fresh: ResolvedRoleAssignment[];
    try {
      fresh = await this.repository.resolveUserRoleAssignments(userId, tenantId);
    } catch {
      throw new ServiceUnavailableException("Tidak dapat memverifikasi hak akses saat ini, coba lagi nanti.");
    }

    this.cache.set(userId, fresh, PERMISSION_CACHE_TTL_SECONDS).catch((err) => {
      this.logger.warn(`Gagal menulis permission cache (best-effort, diabaikan). ${err}`);
    });

    return fresh;
  }
}
