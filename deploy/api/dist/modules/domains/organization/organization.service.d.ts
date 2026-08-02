import { Branch, Company, CostCenter, Department, Location, Site } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { IndustryTemplateService } from "./industry-template/industry-template.service";
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
export declare class OrganizationService {
    private readonly prisma;
    private readonly industryTemplateService;
    constructor(prisma: PrismaService, industryTemplateService: IndustryTemplateService);
    /** industryTemplateId opsional (PRD §5: override template tenant bila
     * company beda sektor) — kalau diisi, DIVALIDASI dulu (task 1.2,
     * IndustryTemplateService.getActiveOrThrow) SEBELUM create, supaya tidak
     * ada company yang diam-diam menyimpan industry_template_id yatim/nonaktif. */
    createCompany(input: CreateCompanyInput): Promise<Company>;
    /** BR-03 — soft-delete company DIRESTRICT bila masih ada branches/sites/
     * departments berstatus ACTIVE, kecuali cascadeDeactivateChildren:true
     * (cascade SOFT-STATUS ke INACTIVE, BUKAN cascade delete). */
    softDeleteCompany(companyId: string, options: {
        cascadeDeactivateChildren: boolean;
    }): Promise<Company>;
    createBranch(input: CreateBranchInput): Promise<Branch>;
    /** @returns site yang dibuat + daftar warning non-blocking (BR-08). */
    createSite(input: CreateSiteInput): Promise<{
        site: Site;
        warnings: string[];
    }>;
    /** Transisi status site (mis. -> ARCHIVED) — BR-01 (end_date wajib
     * sebelum ARCHIVED) ditegakkan ulang di sini, bukan cuma saat create,
     * karena end_date umumnya BARU terisi belakangan (§4.2 Modul 01: proses
     * penutupan site, bukan field yang selalu terisi saat provisioning awal). */
    updateSiteStatus(siteId: string, status: Site["status"]): Promise<Site>;
    createDepartment(input: CreateDepartmentInput): Promise<Department>;
    updateDepartmentParent(departmentId: string, newParentId: string | null): Promise<Department>;
    createCostCenter(input: CreateCostCenterInput): Promise<CostCenter>;
    createLocation(input: CreateLocationInput): Promise<Location>;
}
