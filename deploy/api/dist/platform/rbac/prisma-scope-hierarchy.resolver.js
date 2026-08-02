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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaScopeHierarchyResolver = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../tenancy/prisma.service");
const tenant_context_1 = require("../tenancy/tenant-context");
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
let PrismaScopeHierarchyResolver = class PrismaScopeHierarchyResolver {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async resolveAncestors(tenantId, scopeType, scopeId) {
        if (scopeType === "TENANT") {
            return { tenantId: scopeId };
        }
        return tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
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
        }));
    }
    async resolveDescendantIds(tenantId, scopeType, scopeId, targetLevel) {
        if (scopeType === targetLevel) {
            return [scopeId];
        }
        return tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
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
        }));
    }
};
exports.PrismaScopeHierarchyResolver = PrismaScopeHierarchyResolver;
exports.PrismaScopeHierarchyResolver = PrismaScopeHierarchyResolver = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaScopeHierarchyResolver);
//# sourceMappingURL=prisma-scope-hierarchy.resolver.js.map