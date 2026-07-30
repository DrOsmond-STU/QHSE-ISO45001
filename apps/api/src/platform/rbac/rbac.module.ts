import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { TenancyModule } from "../tenancy/tenancy.module";
import { RedisProvider } from "../auth/redis.provider";
import { PermissionGuard } from "./permission.guard";
import { PermissionService } from "./permission.service";
import { PERMISSION_CACHE } from "./permission-cache.interface";
import { PERMISSION_REPOSITORY } from "./permission-repository.interface";
import { PrismaPermissionRepository } from "./prisma-permission.repository";
import { PrismaScopeHierarchyResolver } from "./prisma-scope-hierarchy.resolver";
import { RbacCacheInvalidationListener } from "./rbac-cache-invalidation.listener";
import { RbacController } from "./rbac.controller";
import { RedisPermissionCache } from "./redis-permission.cache";
import { SCOPE_HIERARCHY_RESOLVER } from "./scope-hierarchy-resolver.interface";

@Module({
  imports: [TenancyModule],
  controllers: [RbacController],
  providers: [
    PermissionService,
    // Instance Redis SENDIRI (bukan reuse punya AuthModule) — tidak ada
    // import antar-module yang dibutuhkan arah mana pun, tetap jaga
    // RbacModule ringan karena bakal di-import setiap modul domain nanti.
    RedisProvider,
    RedisPermissionCache,
    PrismaPermissionRepository,
    // Task 1.1 — containment hierarki organisasi (Master PRD §8.3), query
    // langsung ke companies/branches/sites/departments (lihat komentar
    // banner prisma-scope-hierarchy.resolver.ts kenapa TIDAK lewat import
    // OrganizationModule).
    PrismaScopeHierarchyResolver,
    { provide: PERMISSION_CACHE, useExisting: RedisPermissionCache },
    { provide: PERMISSION_REPOSITORY, useExisting: PrismaPermissionRepository },
    { provide: SCOPE_HIERARCHY_RESOLVER, useExisting: PrismaScopeHierarchyResolver },
    RbacCacheInvalidationListener,
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
  // SCOPE_HIERARCHY_RESOLVER diekspor mulai task 5.3 — dipakai
  // OccupationalHealthAccessControlService (BR-02 dual-gate bagian b)
  // utk containment scope whitelist occupational_health_authorized_users,
  // pola resolusi hierarki YANG SAMA dipakai PermissionService sendiri
  // (task 1.1) — reuse infrastruktur generik, BUKAN duplikasi logic.
  exports: [PermissionService, SCOPE_HIERARCHY_RESOLVER],
})
export class RbacModule {}
