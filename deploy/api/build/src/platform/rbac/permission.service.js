"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PermissionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionService = void 0;
const common_1 = require("@nestjs/common");
const rbac_constants_1 = require("./rbac.constants");
const permission_cache_interface_1 = require("./permission-cache.interface");
const permission_repository_interface_1 = require("./permission-repository.interface");
const permission_resolution_1 = require("./permission-resolution");
const scope_hierarchy_1 = require("./scope-hierarchy");
const scope_hierarchy_resolver_interface_1 = require("./scope-hierarchy-resolver.interface");
// TDD §8.2 — PermissionService: resolusi user_roles -> role_permissions ->
// cek scope, fail closed (cache down -> DB; DB down -> 503, bukan bypass).
let PermissionService = PermissionService_1 = class PermissionService {
    cache;
    repository;
    hierarchyResolver;
    logger = new common_1.Logger(PermissionService_1.name);
    constructor(cache, repository, hierarchyResolver) {
        this.cache = cache;
        this.repository = repository;
        this.hierarchyResolver = hierarchyResolver;
    }
    /**
     * Task 1.1 — resolusi hierarki (ScopeHierarchyResolver, DB) HANYA
     * dipanggil kalau baseline exact-match-or-TENANT (0.8) belum memutuskan
     * `true` DAN ada assignment di level lebih tinggi yang SECARA TEORITIS
     * bisa mengubah hasil — menghindari round-trip DB tambahan di jalur
     * paling umum (tidak punya permission sama sekali, atau sudah exact
     * match/TENANT).
     */
    async hasPermission(userId, tenantId, permissionCode, scopeContext) {
        const assignments = await this.resolve(userId, tenantId);
        if (!scopeContext) {
            return (0, permission_resolution_1.evaluatePermission)(assignments, permissionCode);
        }
        if ((0, permission_resolution_1.evaluatePermission)(assignments, permissionCode, scopeContext)) {
            return true;
        }
        const matching = assignments.filter((a) => a.permissionCodes.includes(permissionCode));
        const needsHierarchy = matching.some((a) => a.scopeId !== null && a.scopeType !== scopeContext.scopeType && scope_hierarchy_1.SCOPE_LEVEL_ORDER[a.scopeType] < scope_hierarchy_1.SCOPE_LEVEL_ORDER[scopeContext.scopeType]);
        if (!needsHierarchy) {
            return false;
        }
        const targetAncestors = await this.hierarchyResolver.resolveAncestors(tenantId, scopeContext.scopeType, scopeContext.scopeId);
        return (0, permission_resolution_1.evaluatePermission)(assignments, permissionCode, scopeContext, targetAncestors);
    }
    async userHasRole(userId, tenantId, roleCode) {
        return (0, permission_resolution_1.evaluateUserHasRole)(await this.resolve(userId, tenantId), roleCode);
    }
    async getScopedIds(userId, tenantId, scopeType) {
        const assignments = await this.resolve(userId, tenantId);
        if (assignments.some((a) => a.scopeType === "TENANT")) {
            return { unrestricted: true };
        }
        const higherAssignments = assignments.filter((a) => a.scopeId !== null && a.scopeType !== scopeType && scope_hierarchy_1.SCOPE_LEVEL_ORDER[a.scopeType] < scope_hierarchy_1.SCOPE_LEVEL_ORDER[scopeType]);
        const resolved = await Promise.all(higherAssignments.map(async (a) => ({
            key: `${a.scopeType}:${a.scopeId}`,
            ids: await this.hierarchyResolver.resolveDescendantIds(tenantId, a.scopeType, a.scopeId, scopeType),
        })));
        const descendantIdsByAssignment = new Map(resolved.map((r) => [r.key, r.ids]));
        return (0, permission_resolution_1.evaluateScopedIds)(assignments, scopeType, descendantIdsByAssignment);
    }
    async invalidateCache(userId) {
        try {
            await this.cache.invalidate(userId);
        }
        catch (err) {
            this.logger.warn(`Gagal invalidasi permission cache untuk user ${userId}: ${err}`);
        }
    }
    /** Dipanggil listener saat role_permissions berubah — belum ada consumer
     * (butuh daftar user per role, ditunda ke task 1.3 saat role-admin CRUD
     * ada). Untuk sekarang hanya placeholder no-op yang aman dipanggil. */
    async invalidateForRole(_roleId, _tenantId) {
        // TODO(1.3): fan-out invalidateCache() ke seluruh userId pemegang roleId
        // ini begitu ada query "cari user by role" (butuh index/tabel tambahan).
        this.logger.debug(`invalidateForRole dipanggil untuk role ${_roleId} — belum ada fan-out (task 1.3).`);
    }
    async resolve(userId, tenantId) {
        try {
            const cached = await this.cache.get(userId);
            if (cached) {
                return cached;
            }
        }
        catch (err) {
            this.logger.warn(`Redis permission cache unavailable — fallback ke DB. ${err}`);
        }
        let fresh;
        try {
            fresh = await this.repository.resolveUserRoleAssignments(userId, tenantId);
        }
        catch {
            throw new common_1.ServiceUnavailableException("Tidak dapat memverifikasi hak akses saat ini, coba lagi nanti.");
        }
        this.cache.set(userId, fresh, rbac_constants_1.PERMISSION_CACHE_TTL_SECONDS).catch((err) => {
            this.logger.warn(`Gagal menulis permission cache (best-effort, diabaikan). ${err}`);
        });
        return fresh;
    }
};
exports.PermissionService = PermissionService;
exports.PermissionService = PermissionService = PermissionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(permission_cache_interface_1.PERMISSION_CACHE)),
    __param(1, (0, common_1.Inject)(permission_repository_interface_1.PERMISSION_REPOSITORY)),
    __param(2, (0, common_1.Inject)(scope_hierarchy_resolver_interface_1.SCOPE_HIERARCHY_RESOLVER)),
    __metadata("design:paramtypes", [Object, Object, Object])
], PermissionService);
