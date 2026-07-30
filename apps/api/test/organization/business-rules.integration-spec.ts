import { ConflictException, INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { DepartmentCycleError } from "../../src/modules/domains/organization/department-hierarchy";
import { OrganizationService } from "../../src/modules/domains/organization/organization.service";
import { SiteLifecycleError } from "../../src/modules/domains/organization/site-lifecycle";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, createTestApp, seedOrganizationTree, seedTenantFixture } from "./test-helpers";

// Task 1.1 acceptance criterion literal: "BR-XX Modul 01 lolos" — via
// OrganizationService SUNGGUHAN (bukan cuma pure function unit test), pola
// sama numbering/workflow-engine integration test.
describe("OrganizationService — business rules (Modul 01 §6)", () => {
  let app: INestApplication;
  let service: OrganizationService;

  beforeAll(async () => {
    app = await createTestApp();
    service = app.get(OrganizationService);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  function asUser<T>(tenantId: string, userId: string, fn: () => Promise<T>): Promise<T> {
    return tenantContextStorage.run({ tenantId, userId }, fn);
  }

  it("BR-01: create site PROJECT tanpa start_date -> ditolak", async () => {
    const fixture = await seedTenantFixture();
    const { branch, company } = await seedOrganizationTree(fixture.tenantId, fixture.userId);

    await expect(
      asUser(fixture.tenantId, fixture.userId, () =>
        service.createSite({
          companyId: company.id,
          branchId: branch.id,
          siteCode: `PROJ-${randomUUID().slice(0, 8)}`,
          name: "Proyek Tanpa Start Date",
          siteType: "PROJECT",
        }),
      ),
    ).rejects.toThrow(SiteLifecycleError);
  });

  it("BR-01: create site PROJECT dengan start_date -> lolos", async () => {
    const fixture = await seedTenantFixture();
    const { branch, company } = await seedOrganizationTree(fixture.tenantId, fixture.userId);

    const { site } = await asUser(fixture.tenantId, fixture.userId, () =>
      service.createSite({
        companyId: company.id,
        branchId: branch.id,
        siteCode: `PROJ-${randomUUID().slice(0, 8)}`,
        name: "Proyek Valid",
        siteType: "PROJECT",
        startDate: new Date(),
      }),
    );
    expect(site.siteType).toBe("PROJECT");
  });

  it("BR-01: updateSiteStatus ke ARCHIVED tanpa end_date -> ditolak", async () => {
    const fixture = await seedTenantFixture();
    const { branch, company } = await seedOrganizationTree(fixture.tenantId, fixture.userId);
    const { site } = await asUser(fixture.tenantId, fixture.userId, () =>
      service.createSite({
        companyId: company.id,
        branchId: branch.id,
        siteCode: `PROJ-${randomUUID().slice(0, 8)}`,
        name: "Proyek Mau Diarsip",
        siteType: "PROJECT",
        startDate: new Date(),
      }),
    );

    await expect(asUser(fixture.tenantId, fixture.userId, () => service.updateSiteStatus(site.id, "ARCHIVED"))).rejects.toThrow(
      SiteLifecycleError,
    );
  });

  it("BR-01: updateSiteStatus ke ARCHIVED dengan end_date terisi -> lolos", async () => {
    const fixture = await seedTenantFixture();
    const { branch, company } = await seedOrganizationTree(fixture.tenantId, fixture.userId);
    const { site } = await asUser(fixture.tenantId, fixture.userId, () =>
      service.createSite({
        companyId: company.id,
        branchId: branch.id,
        siteCode: `PROJ-${randomUUID().slice(0, 8)}`,
        name: "Proyek Selesai",
        siteType: "PROJECT",
        startDate: new Date(),
        endDate: new Date(),
      }),
    );

    const archived = await asUser(fixture.tenantId, fixture.userId, () => service.updateSiteStatus(site.id, "ARCHIVED"));
    expect(archived.status).toBe("ARCHIVED");
    expect(archived.actualClosureDate).not.toBeNull();
  });

  it("BR-02: company_code duplikat di tenant yang sama -> ConflictException", async () => {
    const fixture = await seedTenantFixture();
    const companyCode = `DUP-${randomUUID().slice(0, 8)}`;

    await asUser(fixture.tenantId, fixture.userId, () =>
      service.createCompany({ companyCode, legalName: "PT Pertama", displayName: "Pertama" }),
    );

    await expect(
      asUser(fixture.tenantId, fixture.userId, () =>
        service.createCompany({ companyCode, legalName: "PT Kedua", displayName: "Kedua" }),
      ),
    ).rejects.toThrow(ConflictException);
  });

  it("BR-02: company_code yang SAMA boleh dipakai di TENANT lain (unik per tenant, bukan global)", async () => {
    const fixtureA = await seedTenantFixture();
    const fixtureB = await seedTenantFixture();
    const companyCode = `SHARED-${randomUUID().slice(0, 8)}`;

    await asUser(fixtureA.tenantId, fixtureA.userId, () =>
      service.createCompany({ companyCode, legalName: "PT A", displayName: "A" }),
    );

    await expect(
      asUser(fixtureB.tenantId, fixtureB.userId, () =>
        service.createCompany({ companyCode, legalName: "PT B", displayName: "B" }),
      ),
    ).resolves.toMatchObject({ companyCode });
  });

  it("BR-03: soft-delete company dengan anak ACTIVE tanpa cascade -> ConflictException", async () => {
    const fixture = await seedTenantFixture();
    const { company } = await seedOrganizationTree(fixture.tenantId, fixture.userId);

    await expect(
      asUser(fixture.tenantId, fixture.userId, () => service.softDeleteCompany(company.id, { cascadeDeactivateChildren: false })),
    ).rejects.toThrow(ConflictException);
  });

  it("BR-03: soft-delete company dengan cascade:true -> company+anak (branch/site/department) jadi INACTIVE/deleted", async () => {
    const fixture = await seedTenantFixture();
    const { company, branch, site, department } = await seedOrganizationTree(fixture.tenantId, fixture.userId);

    await asUser(fixture.tenantId, fixture.userId, () => service.softDeleteCompany(company.id, { cascadeDeactivateChildren: true }));

    const [reloadedBranch, reloadedSite, reloadedDepartment, reloadedCompany] = await Promise.all([
      adminPrisma.branch.findUniqueOrThrow({ where: { id: branch.id } }),
      adminPrisma.site.findUniqueOrThrow({ where: { id: site.id } }),
      adminPrisma.department.findUniqueOrThrow({ where: { id: department.id } }),
      adminPrisma.company.findUniqueOrThrow({ where: { id: company.id } }),
    ]);
    expect(reloadedBranch.status).toBe("INACTIVE");
    expect(reloadedSite.status).toBe("INACTIVE");
    expect(reloadedDepartment.status).toBe("INACTIVE");
    expect(reloadedCompany.deletedAt).not.toBeNull();
  });

  it("BR-07: department parent membentuk siklus -> ditolak", async () => {
    const fixture = await seedTenantFixture();
    const { company, branch, site } = await seedOrganizationTree(fixture.tenantId, fixture.userId);

    const deptA = await asUser(fixture.tenantId, fixture.userId, () =>
      service.createDepartment({
        companyId: company.id,
        branchId: branch.id,
        siteId: site.id,
        departmentCode: `A-${randomUUID().slice(0, 6)}`,
        name: "Dept A",
      }),
    );
    const deptB = await asUser(fixture.tenantId, fixture.userId, () =>
      service.createDepartment({
        companyId: company.id,
        branchId: branch.id,
        siteId: site.id,
        parentDepartmentId: deptA.id,
        departmentCode: `B-${randomUUID().slice(0, 6)}`,
        name: "Dept B",
      }),
    );

    // Coba jadikan A anak dari B -- padahal B sudah anak A -> siklus.
    await expect(
      asUser(fixture.tenantId, fixture.userId, () => service.updateDepartmentParent(deptA.id, deptB.id)),
    ).rejects.toThrow(DepartmentCycleError);
  });

  it("BR-07: department parent valid (bukan siklus) -> lolos", async () => {
    const fixture = await seedTenantFixture();
    const { company, branch, site } = await seedOrganizationTree(fixture.tenantId, fixture.userId);

    const deptA = await asUser(fixture.tenantId, fixture.userId, () =>
      service.createDepartment({
        companyId: company.id,
        branchId: branch.id,
        siteId: site.id,
        departmentCode: `A-${randomUUID().slice(0, 6)}`,
        name: "Dept A",
      }),
    );

    const deptC = await asUser(fixture.tenantId, fixture.userId, () =>
      service.createDepartment({
        companyId: company.id,
        branchId: branch.id,
        siteId: site.id,
        departmentCode: `C-${randomUUID().slice(0, 6)}`,
        name: "Dept C",
      }),
    );

    const updated = await asUser(fixture.tenantId, fixture.userId, () => service.updateDepartmentParent(deptC.id, deptA.id));
    expect(updated.parentDepartmentId).toBe(deptA.id);
  });

  it("BR-08: site kategori RIG tanpa geo -> warning (bukan error)", async () => {
    const fixture = await seedTenantFixture();
    const { branch, company } = await seedOrganizationTree(fixture.tenantId, fixture.userId);

    const { site, warnings } = await asUser(fixture.tenantId, fixture.userId, () =>
      service.createSite({
        companyId: company.id,
        branchId: branch.id,
        siteCode: `RIG-${randomUUID().slice(0, 8)}`,
        name: "Rig Tanpa Koordinat",
        siteType: "PERMANENT",
        category: "RIG",
      }),
    );

    expect(site.status).toBe("ACTIVE"); // tidak diblok
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain("BR-08");
  });

  it("BR-08: site kategori RIG DENGAN geo -> tidak ada warning", async () => {
    const fixture = await seedTenantFixture();
    const { branch, company } = await seedOrganizationTree(fixture.tenantId, fixture.userId);

    const { warnings } = await asUser(fixture.tenantId, fixture.userId, () =>
      service.createSite({
        companyId: company.id,
        branchId: branch.id,
        siteCode: `RIG-${randomUUID().slice(0, 8)}`,
        name: "Rig Dengan Koordinat",
        siteType: "PERMANENT",
        category: "RIG",
        geoLat: -1.2,
        geoLong: 116.8,
      }),
    );

    expect(warnings).toHaveLength(0);
  });
});
