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
exports.OrganizationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const department_hierarchy_1 = require("./department-hierarchy");
const site_lifecycle_1 = require("./site-lifecycle");
const industry_template_service_1 = require("./industry-template/industry-template.service");
const organization_context_1 = require("./organization-context");
// Task 1.1 (Modul 01) — write-side hierarki organisasi. BELUM ada endpoint
// HTTP (sama pola task 0.9/0.10/0.11 — "belum ada controller HTTP, dipakai
// in-process") — Goal literal TASK_INSTRUCTION.md 1.1 cuma minta
// tabel+service resolusi hierarki, bukan CRUD API; endpoint (dgn RBAC
// @RequirePermission ORG.*, DTO validation) menyusul begitu ada task yang
// eksplisit memintanya. Method di sini dites langsung lewat integration
// test (pola sama numbering/workflow-engine), bukan lewat HTTP.
let OrganizationService = class OrganizationService {
    prisma;
    industryTemplateService;
    constructor(prisma, industryTemplateService) {
        this.prisma = prisma;
        this.industryTemplateService = industryTemplateService;
    }
    /** industryTemplateId opsional (PRD §5: override template tenant bila
     * company beda sektor) — kalau diisi, DIVALIDASI dulu (task 1.2,
     * IndustryTemplateService.getActiveOrThrow) SEBELUM create, supaya tidak
     * ada company yang diam-diam menyimpan industry_template_id yatim/nonaktif. */
    async createCompany(input) {
        if (input.industryTemplateId) {
            await this.industryTemplateService.getActiveOrThrow(input.industryTemplateId);
        }
        const createdBy = (0, organization_context_1.requireActorUserId)();
        const tenantId = (0, organization_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => (0, organization_context_1.withCleanUniqueViolation)(() => tx.company.create({
            data: { ...input, tenantId, createdBy, updatedBy: createdBy },
        }), `BR-02: company_code "${input.companyCode}" sudah dipakai di tenant ini.`));
    }
    /** BR-03 — soft-delete company DIRESTRICT bila masih ada branches/sites/
     * departments berstatus ACTIVE, kecuali cascadeDeactivateChildren:true
     * (cascade SOFT-STATUS ke INACTIVE, BUKAN cascade delete). */
    async softDeleteCompany(companyId, options) {
        return this.prisma.withRls(async (tx) => {
            const [activeBranches, activeSites, activeDepartments] = await Promise.all([
                tx.branch.count({ where: { companyId, status: "ACTIVE" } }),
                tx.site.count({ where: { companyId, status: "ACTIVE" } }),
                tx.department.count({ where: { companyId, status: "ACTIVE" } }),
            ]);
            const activeChildrenCount = activeBranches + activeSites + activeDepartments;
            if (activeChildrenCount > 0 && !options.cascadeDeactivateChildren) {
                throw new common_1.ConflictException(`BR-03: company masih memiliki ${activeChildrenCount} entitas anak berstatus ACTIVE (branches/sites/departments) — set cascadeDeactivateChildren:true untuk menonaktifkan sekaligus, atau nonaktifkan manual dulu.`);
            }
            if (activeChildrenCount > 0) {
                const updatedBy = (0, organization_context_1.requireActorUserId)();
                await tx.branch.updateMany({ where: { companyId, status: "ACTIVE" }, data: { status: "INACTIVE", updatedBy } });
                await tx.site.updateMany({ where: { companyId, status: "ACTIVE" }, data: { status: "INACTIVE", updatedBy } });
                await tx.department.updateMany({ where: { companyId, status: "ACTIVE" }, data: { status: "INACTIVE", updatedBy } });
            }
            return tx.company.update({ where: { id: companyId }, data: { deletedAt: new Date() } });
        });
    }
    async createBranch(input) {
        const createdBy = (0, organization_context_1.requireActorUserId)();
        const tenantId = (0, organization_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => (0, organization_context_1.withCleanUniqueViolation)(() => tx.branch.create({ data: { ...input, tenantId, createdBy, updatedBy: createdBy } }), `BR-02: branch_code "${input.branchCode}" sudah dipakai di company ini.`));
    }
    /** @returns site yang dibuat + daftar warning non-blocking (BR-08). */
    async createSite(input) {
        (0, site_lifecycle_1.validateSiteLifecycle)({
            siteType: input.siteType,
            startDate: input.startDate ?? null,
            endDate: input.endDate ?? null,
            status: "ACTIVE",
        });
        const createdBy = (0, organization_context_1.requireActorUserId)();
        const tenantId = (0, organization_context_1.requireTenantId)();
        const site = await this.prisma.withRls((tx) => (0, organization_context_1.withCleanUniqueViolation)(() => tx.site.create({ data: { ...input, tenantId, createdBy, updatedBy: createdBy } }), `BR-02: site_code "${input.siteCode}" sudah dipakai di tenant ini.`));
        const warnings = [];
        if ((0, site_lifecycle_1.shouldWarnMissingGeoCoordinates)(site.category, site.geoLat, site.geoLong)) {
            warnings.push(`BR-08: site kategori ${site.category} direkomendasikan mengisi koordinat geo_lat/geo_long.`);
        }
        return { site, warnings };
    }
    /** Transisi status site (mis. -> ARCHIVED) — BR-01 (end_date wajib
     * sebelum ARCHIVED) ditegakkan ulang di sini, bukan cuma saat create,
     * karena end_date umumnya BARU terisi belakangan (§4.2 Modul 01: proses
     * penutupan site, bukan field yang selalu terisi saat provisioning awal). */
    async updateSiteStatus(siteId, status) {
        const updatedBy = (0, organization_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const current = await tx.site.findUniqueOrThrow({ where: { id: siteId } });
            (0, site_lifecycle_1.validateSiteLifecycle)({
                siteType: current.siteType,
                startDate: current.startDate,
                endDate: current.endDate,
                status,
            });
            return tx.site.update({
                where: { id: siteId },
                data: {
                    status,
                    updatedBy,
                    actualClosureDate: status === "ARCHIVED" ? new Date() : current.actualClosureDate,
                },
            });
        });
    }
    async createDepartment(input) {
        const createdBy = (0, organization_context_1.requireActorUserId)();
        const tenantId = (0, organization_context_1.requireTenantId)();
        return this.prisma.withRls(async (tx) => {
            if (input.parentDepartmentId) {
                await (0, department_hierarchy_1.assertNoParentCycle)(null, input.parentDepartmentId, async (id) => {
                    const row = await tx.department.findUnique({ where: { id }, select: { parentDepartmentId: true } });
                    return row?.parentDepartmentId ?? null;
                });
            }
            return (0, organization_context_1.withCleanUniqueViolation)(() => tx.department.create({ data: { ...input, tenantId, createdBy, updatedBy: createdBy } }), `BR-02: department_code "${input.departmentCode}" sudah dipakai di site ini.`);
        });
    }
    async updateDepartmentParent(departmentId, newParentId) {
        const updatedBy = (0, organization_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            if (newParentId) {
                await (0, department_hierarchy_1.assertNoParentCycle)(departmentId, newParentId, async (id) => {
                    const row = await tx.department.findUnique({ where: { id }, select: { parentDepartmentId: true } });
                    return row?.parentDepartmentId ?? null;
                });
            }
            return tx.department.update({ where: { id: departmentId }, data: { parentDepartmentId: newParentId, updatedBy } });
        });
    }
    async createCostCenter(input) {
        const createdBy = (0, organization_context_1.requireActorUserId)();
        const tenantId = (0, organization_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => (0, organization_context_1.withCleanUniqueViolation)(() => tx.costCenter.create({ data: { ...input, tenantId, createdBy, updatedBy: createdBy } }), `BR-02: cost_center_code "${input.costCenterCode}" sudah dipakai di company ini.`));
    }
    async createLocation(input) {
        const createdBy = (0, organization_context_1.requireActorUserId)();
        const tenantId = (0, organization_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.location.create({ data: { ...input, tenantId, createdBy, updatedBy: createdBy } }));
    }
};
exports.OrganizationService = OrganizationService;
exports.OrganizationService = OrganizationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        industry_template_service_1.IndustryTemplateService])
], OrganizationService);
//# sourceMappingURL=organization.service.js.map