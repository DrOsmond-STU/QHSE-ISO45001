"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RbacModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const tenancy_module_1 = require("../tenancy/tenancy.module");
const redis_provider_1 = require("../auth/redis.provider");
const redis_enabled_helper_1 = require("../scheduling/redis-enabled.helper");
const in_memory_permission_cache_1 = require("./in-memory-permission.cache");
const permission_guard_1 = require("./permission.guard");
const permission_service_1 = require("./permission.service");
const permission_cache_interface_1 = require("./permission-cache.interface");
const permission_repository_interface_1 = require("./permission-repository.interface");
const prisma_permission_repository_1 = require("./prisma-permission.repository");
const prisma_scope_hierarchy_resolver_1 = require("./prisma-scope-hierarchy.resolver");
const rbac_cache_invalidation_listener_1 = require("./rbac-cache-invalidation.listener");
const rbac_controller_1 = require("./rbac.controller");
const redis_permission_cache_1 = require("./redis-permission.cache");
const scope_hierarchy_resolver_interface_1 = require("./scope-hierarchy-resolver.interface");
let RbacModule = class RbacModule {
};
exports.RbacModule = RbacModule;
exports.RbacModule = RbacModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule],
        controllers: [rbac_controller_1.RbacController],
        providers: [
            permission_service_1.PermissionService,
            // Instance Redis SENDIRI (bukan reuse punya AuthModule) — tidak ada
            // import antar-module yang dibutuhkan arah mana pun, tetap jaga
            // RbacModule ringan karena bakal di-import setiap modul domain nanti.
            redis_provider_1.RedisProvider,
            redis_permission_cache_1.RedisPermissionCache,
            // Shared-hosting adaptation (REDIS_ENABLED=false) — lihat banner
            // comment in-memory-permission.cache.ts.
            in_memory_permission_cache_1.InMemoryPermissionCache,
            prisma_permission_repository_1.PrismaPermissionRepository,
            // Task 1.1 — containment hierarki organisasi (Master PRD §8.3), query
            // langsung ke companies/branches/sites/departments (lihat komentar
            // banner prisma-scope-hierarchy.resolver.ts kenapa TIDAK lewat import
            // OrganizationModule).
            prisma_scope_hierarchy_resolver_1.PrismaScopeHierarchyResolver,
            {
                provide: permission_cache_interface_1.PERMISSION_CACHE,
                useFactory: (redisCache, memCache) => (0, redis_enabled_helper_1.isRedisEnabled)() ? redisCache : memCache,
                inject: [redis_permission_cache_1.RedisPermissionCache, in_memory_permission_cache_1.InMemoryPermissionCache],
            },
            { provide: permission_repository_interface_1.PERMISSION_REPOSITORY, useExisting: prisma_permission_repository_1.PrismaPermissionRepository },
            { provide: scope_hierarchy_resolver_interface_1.SCOPE_HIERARCHY_RESOLVER, useExisting: prisma_scope_hierarchy_resolver_1.PrismaScopeHierarchyResolver },
            rbac_cache_invalidation_listener_1.RbacCacheInvalidationListener,
            { provide: core_1.APP_GUARD, useClass: permission_guard_1.PermissionGuard },
        ],
        // SCOPE_HIERARCHY_RESOLVER diekspor mulai task 5.3 — dipakai
        // OccupationalHealthAccessControlService (BR-02 dual-gate bagian b)
        // utk containment scope whitelist occupational_health_authorized_users,
        // pola resolusi hierarki YANG SAMA dipakai PermissionService sendiri
        // (task 1.1) — reuse infrastruktur generik, BUKAN duplikasi logic.
        exports: [permission_service_1.PermissionService, scope_hierarchy_resolver_interface_1.SCOPE_HIERARCHY_RESOLVER],
    })
], RbacModule);
