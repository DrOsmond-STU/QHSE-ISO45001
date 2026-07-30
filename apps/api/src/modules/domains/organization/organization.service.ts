import { ConflictException, Injectable } from "@nestjs/common";
import { Branch, Company, CostCenter, Department, Location, Site } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { assertNoParentCycle } from "./department-hierarchy";
import { shouldWarnMissingGeoCoordinates, validateSiteLifecycle } from "./site-lifecycle";
import { IndustryTemplateService } from "./industry-template/industry-template.service";
import { requireActorUserId, requireTenantId, withCleanUniqueViolation } from "./organization-context";

export interface CreateCompanyInput {
  companyCode: string;
  legalName: string;
  displayName: string;
  businessRegistrationNo?: string;
  taxId?: string;
  industryTemplateId?: string;
  locationId?: string;
  effectiveDate?: Date;
}

export interface CreateBranchInput {
  companyId: string;
  branchCode: string;
  name: string;
  branchType?: Branch["branchType"];
  locationId?: string;
}

export interface CreateSiteInput {
  companyId: string;
  branchId: string;
  siteCode: string;
  name: string;
  siteType: Site["siteType"];
  category?: Site["category"];
  startDate?: Date;
  endDate?: Date;
  locationId?: string;
  geoLat?: number;
  geoLong?: number;
  timezone?: string;
  riskProfile?: Site["riskProfile"];
  autoArchiveOnEndDate?: boolean;
}

export interface CreateDepartmentInput {
  companyId: string;
  branchId: string;
  siteId: string;
  parentDepartmentId?: string;
  departmentCode: string;
  name: string;
  departmentType?: Department["departmentType"];
  costCenterId?: string;
  headUserId?: string;
}

export interface CreateCostCenterInput {
  companyId: string;
  costCenterCode: string;
  name: string;
  glAccountRef?: string;
}

export interface CreateLocationInput {
  addressLine1: string;
  addressLine2?: string;
  village?: string;
  district?: string;
  cityRegency: string;
  province: string;
  postalCode?: string;
  country?: string;
  geoLat?: number;
  geoLong?: number;
}

// Task 1.1 (Modul 01) — write-side hierarki organisasi. BELUM ada endpoint
// HTTP (sama pola task 0.9/0.10/0.11 — "belum ada controller HTTP, dipakai
// in-process") — Goal literal TASK_INSTRUCTION.md 1.1 cuma minta
// tabel+service resolusi hierarki, bukan CRUD API; endpoint (dgn RBAC
// @RequirePermission ORG.*, DTO validation) menyusul begitu ada task yang
// eksplisit memintanya. Method di sini dites langsung lewat integration
// test (pola sama numbering/workflow-engine), bukan lewat HTTP.
@Injectable()
export class OrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly industryTemplateService: IndustryTemplateService,
  ) {}

  /** industryTemplateId opsional (PRD §5: override template tenant bila
   * company beda sektor) — kalau diisi, DIVALIDASI dulu (task 1.2,
   * IndustryTemplateService.getActiveOrThrow) SEBELUM create, supaya tidak
   * ada company yang diam-diam menyimpan industry_template_id yatim/nonaktif. */
  async createCompany(input: CreateCompanyInput): Promise<Company> {
    if (input.industryTemplateId) {
      await this.industryTemplateService.getActiveOrThrow(input.industryTemplateId);
    }
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) =>
      withCleanUniqueViolation(
        () =>
          tx.company.create({
            data: { ...input, tenantId, createdBy, updatedBy: createdBy },
          }),
        `BR-02: company_code "${input.companyCode}" sudah dipakai di tenant ini.`,
      ),
    );
  }

  /** BR-03 — soft-delete company DIRESTRICT bila masih ada branches/sites/
   * departments berstatus ACTIVE, kecuali cascadeDeactivateChildren:true
   * (cascade SOFT-STATUS ke INACTIVE, BUKAN cascade delete). */
  async softDeleteCompany(companyId: string, options: { cascadeDeactivateChildren: boolean }): Promise<Company> {
    return this.prisma.withRls(async (tx) => {
      const [activeBranches, activeSites, activeDepartments] = await Promise.all([
        tx.branch.count({ where: { companyId, status: "ACTIVE" } }),
        tx.site.count({ where: { companyId, status: "ACTIVE" } }),
        tx.department.count({ where: { companyId, status: "ACTIVE" } }),
      ]);
      const activeChildrenCount = activeBranches + activeSites + activeDepartments;

      if (activeChildrenCount > 0 && !options.cascadeDeactivateChildren) {
        throw new ConflictException(
          `BR-03: company masih memiliki ${activeChildrenCount} entitas anak berstatus ACTIVE (branches/sites/departments) — set cascadeDeactivateChildren:true untuk menonaktifkan sekaligus, atau nonaktifkan manual dulu.`,
        );
      }

      if (activeChildrenCount > 0) {
        const updatedBy = requireActorUserId();
        await tx.branch.updateMany({ where: { companyId, status: "ACTIVE" }, data: { status: "INACTIVE", updatedBy } });
        await tx.site.updateMany({ where: { companyId, status: "ACTIVE" }, data: { status: "INACTIVE", updatedBy } });
        await tx.department.updateMany({ where: { companyId, status: "ACTIVE" }, data: { status: "INACTIVE", updatedBy } });
      }

      return tx.company.update({ where: { id: companyId }, data: { deletedAt: new Date() } });
    });
  }

  async createBranch(input: CreateBranchInput): Promise<Branch> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) =>
      withCleanUniqueViolation(
        () => tx.branch.create({ data: { ...input, tenantId, createdBy, updatedBy: createdBy } }),
        `BR-02: branch_code "${input.branchCode}" sudah dipakai di company ini.`,
      ),
    );
  }

  /** @returns site yang dibuat + daftar warning non-blocking (BR-08). */
  async createSite(input: CreateSiteInput): Promise<{ site: Site; warnings: string[] }> {
    validateSiteLifecycle({
      siteType: input.siteType,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      status: "ACTIVE",
    });

    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    const site = await this.prisma.withRls((tx) =>
      withCleanUniqueViolation(
        () => tx.site.create({ data: { ...input, tenantId, createdBy, updatedBy: createdBy } }),
        `BR-02: site_code "${input.siteCode}" sudah dipakai di tenant ini.`,
      ),
    );

    const warnings: string[] = [];
    if (shouldWarnMissingGeoCoordinates(site.category, site.geoLat, site.geoLong)) {
      warnings.push(`BR-08: site kategori ${site.category} direkomendasikan mengisi koordinat geo_lat/geo_long.`);
    }
    return { site, warnings };
  }

  /** Transisi status site (mis. -> ARCHIVED) — BR-01 (end_date wajib
   * sebelum ARCHIVED) ditegakkan ulang di sini, bukan cuma saat create,
   * karena end_date umumnya BARU terisi belakangan (§4.2 Modul 01: proses
   * penutupan site, bukan field yang selalu terisi saat provisioning awal). */
  async updateSiteStatus(siteId: string, status: Site["status"]): Promise<Site> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      const current = await tx.site.findUniqueOrThrow({ where: { id: siteId } });
      validateSiteLifecycle({
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

  async createDepartment(input: CreateDepartmentInput): Promise<Department> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls(async (tx) => {
      if (input.parentDepartmentId) {
        await assertNoParentCycle(null, input.parentDepartmentId, async (id) => {
          const row = await tx.department.findUnique({ where: { id }, select: { parentDepartmentId: true } });
          return row?.parentDepartmentId ?? null;
        });
      }
      return withCleanUniqueViolation(
        () => tx.department.create({ data: { ...input, tenantId, createdBy, updatedBy: createdBy } }),
        `BR-02: department_code "${input.departmentCode}" sudah dipakai di site ini.`,
      );
    });
  }

  async updateDepartmentParent(departmentId: string, newParentId: string | null): Promise<Department> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      if (newParentId) {
        await assertNoParentCycle(departmentId, newParentId, async (id) => {
          const row = await tx.department.findUnique({ where: { id }, select: { parentDepartmentId: true } });
          return row?.parentDepartmentId ?? null;
        });
      }
      return tx.department.update({ where: { id: departmentId }, data: { parentDepartmentId: newParentId, updatedBy } });
    });
  }

  async createCostCenter(input: CreateCostCenterInput): Promise<CostCenter> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) =>
      withCleanUniqueViolation(
        () => tx.costCenter.create({ data: { ...input, tenantId, createdBy, updatedBy: createdBy } }),
        `BR-02: cost_center_code "${input.costCenterCode}" sudah dipakai di company ini.`,
      ),
    );
  }

  async createLocation(input: CreateLocationInput): Promise<Location> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) => tx.location.create({ data: { ...input, tenantId, createdBy, updatedBy: createdBy } }));
  }
}
