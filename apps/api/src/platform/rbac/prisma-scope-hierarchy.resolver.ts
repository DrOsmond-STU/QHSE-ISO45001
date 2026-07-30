import { Injectable } from "@nestjs/common";
import { ScopeType } from "@prisma/client";
import { PrismaService } from "../tenancy/prisma.service";
import { tenantContextStorage } from "../tenancy/tenant-context";
import { ScopeAncestors } from "./scope-hierarchy";
import { ScopeHierarchyResolver } from "./scope-hierarchy-resolver.interface";

// Task 1.1 — implementasi konkret ScopeHierarchyResolver, query LANGSUNG ke
// companies/branches/sites/departments (tabel Modul 01/domain "organization")
// dari platform/rbac. Ini SENGAJA, bukan RbacModule mengimpor
// OrganizationModule — arah dependency modular monolith yang benar adalah
// modul domain boleh impor platform, BUKAN sebaliknya (platform impor
// domain akan membalik arah & berpotensi circular begitu OrganizationModule
// nanti butuh RbacModule juga, mis. authoring endpoint dengan @RequirePermission).
// Pola sama PrismaPermissionRepository (0.8) yang juga query user_roles/roles
// langsung tanpa "UserRoleModule" — Prisma schema adalah resource bersama,
// batas modul NestJS adalah soal wiring DI/service class, bukan soal siapa
// "boleh" SELECT dari tabel mana.
//
// Modul organization (domain) sendiri PAKAI ULANG fungsi resolveAncestors/
// resolveDescendantIds yang SAMA (import langsung, arah domain->platform
// yang benar) untuk kebutuhannya sendiri (mis. UI breadcrumb/tree) — bukan
// duplikasi query.
@Injectable()
export class PrismaScopeHierarchyResolver implements ScopeHierarchyResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolveAncestors(tenantId: string, scopeType: ScopeType, scopeId: string): Promise<ScopeAncestors | undefined> {
    if (scopeType === "TENANT") {
      return { tenantId: scopeId };
    }

    return tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx): Promise<ScopeAncestors | undefined> => {
        switch (scopeType) {
          case "COMPANY": {
            const row = await tx.company.findUnique({ where: { id: scopeId } });
            return row ? { tenantId: row.tenantId, companyId: row.id } : undefined;
          }
          case "BRANCH": {
            const row = await tx.branch.findUnique({ where: { id: scopeId } });
            return row ? { tenantId: row.tenantId, companyId: row.companyId, branchId: row.id } : undefined;
          }
          case "SITE": {
            const row = await tx.site.findUnique({ where: { id: scopeId } });
            return row
              ? { tenantId: row.tenantId, companyId: row.companyId, branchId: row.branchId, siteId: row.id }
              : undefined;
          }
          case "DEPARTMENT": {
            const row = await tx.department.findUnique({ where: { id: scopeId } });
            return row
              ? {
                  tenantId: row.tenantId,
                  companyId: row.companyId,
                  branchId: row.branchId,
                  siteId: row.siteId,
                  departmentId: row.id,
                }
              : undefined;
          }
          default:
            return undefined;
        }
      }),
    );
  }

  async resolveDescendantIds(tenantId: string, scopeType: ScopeType, scopeId: string, targetLevel: ScopeType): Promise<string[]> {
    if (scopeType === targetLevel) {
      return [scopeId];
    }

    return tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx): Promise<string[]> => {
        if (scopeType === "TENANT") {
          switch (targetLevel) {
            case "COMPANY":
              return (await tx.company.findMany({ where: { tenantId: scopeId }, select: { id: true } })).map((r) => r.id);
            case "BRANCH":
              return (await tx.branch.findMany({ where: { tenantId: scopeId }, select: { id: true } })).map((r) => r.id);
            case "SITE":
              return (await tx.site.findMany({ where: { tenantId: scopeId }, select: { id: true } })).map((r) => r.id);
            case "DEPARTMENT":
              return (await tx.department.findMany({ where: { tenantId: scopeId }, select: { id: true } })).map((r) => r.id);
            default:
              return [];
          }
        }
        if (scopeType === "COMPANY") {
          switch (targetLevel) {
            case "BRANCH":
              return (await tx.branch.findMany({ where: { companyId: scopeId }, select: { id: true } })).map((r) => r.id);
            case "SITE":
              return (await tx.site.findMany({ where: { companyId: scopeId }, select: { id: true } })).map((r) => r.id);
            case "DEPARTMENT":
              return (await tx.department.findMany({ where: { companyId: scopeId }, select: { id: true } })).map((r) => r.id);
            default:
              return [];
          }
        }
        if (scopeType === "BRANCH") {
          switch (targetLevel) {
            case "SITE":
              return (await tx.site.findMany({ where: { branchId: scopeId }, select: { id: true } })).map((r) => r.id);
            case "DEPARTMENT":
              return (await tx.department.findMany({ where: { branchId: scopeId }, select: { id: true } })).map((r) => r.id);
            default:
              return [];
          }
        }
        if (scopeType === "SITE" && targetLevel === "DEPARTMENT") {
          return (await tx.department.findMany({ where: { siteId: scopeId }, select: { id: true } })).map((r) => r.id);
        }
        return [];
      }),
    );
  }
}
