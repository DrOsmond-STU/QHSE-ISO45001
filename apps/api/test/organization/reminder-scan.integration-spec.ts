import { INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { ReminderScanService } from "../../src/modules/domains/organization/reminder-scan.service";
import { adminPrisma, createTestApp, seedOrganizationTree, seedTenantFixture } from "./test-helpers";

// Task 1.1 acceptance criterion literal (BR-06, PRD Modul 01 §6): "sites
// dengan auto_archive_on_end_date=TRUE dan site_type=PROJECT otomatis
// dipindah ke status INACTIVE (BUKAN ARCHIVED) saat end_date terlewati."
describe("ReminderScanService — BR-06 site auto-deactivate", () => {
  let app: INestApplication;
  let service: ReminderScanService;

  beforeAll(async () => {
    app = await createTestApp();
    service = app.get(ReminderScanService);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  async function seedProjectSite(
    tenantId: string,
    userId: string,
    overrides: { endDate: Date; autoArchiveOnEndDate?: boolean; status?: "ACTIVE" | "INACTIVE" },
  ) {
    const { branch, company } = await seedOrganizationTree(tenantId, userId);
    return adminPrisma.site.create({
      data: {
        tenantId,
        companyId: company.id,
        branchId: branch.id,
        siteCode: `PROJ-${randomUUID().slice(0, 8)}`,
        name: "Proyek Scan Test",
        siteType: "PROJECT",
        startDate: new Date("2020-01-01"),
        endDate: overrides.endDate,
        autoArchiveOnEndDate: overrides.autoArchiveOnEndDate ?? true,
        status: overrides.status ?? "ACTIVE",
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  it("site PROJECT yang end_date-nya SUDAH LEWAT -> INACTIVE setelah scan", async () => {
    const fixture = await seedTenantFixture();
    const site = await seedProjectSite(fixture.tenantId, fixture.userId, { endDate: new Date("2026-01-01") });

    await service.scan(new Date("2026-06-01"));

    const reloaded = await adminPrisma.site.findUniqueOrThrow({ where: { id: site.id } });
    expect(reloaded.status).toBe("INACTIVE");
  });

  it("site PROJECT yang end_date-nya BELUM lewat -> tetap ACTIVE", async () => {
    const fixture = await seedTenantFixture();
    const site = await seedProjectSite(fixture.tenantId, fixture.userId, { endDate: new Date("2027-01-01") });

    await service.scan(new Date("2026-06-01"));

    const reloaded = await adminPrisma.site.findUniqueOrThrow({ where: { id: site.id } });
    expect(reloaded.status).toBe("ACTIVE");
  });

  it("site dengan auto_archive_on_end_date=false TIDAK ikut dinonaktifkan walau end_date lewat", async () => {
    const fixture = await seedTenantFixture();
    const site = await seedProjectSite(fixture.tenantId, fixture.userId, {
      endDate: new Date("2026-01-01"),
      autoArchiveOnEndDate: false,
    });

    await service.scan(new Date("2026-06-01"));

    const reloaded = await adminPrisma.site.findUniqueOrThrow({ where: { id: site.id } });
    expect(reloaded.status).toBe("ACTIVE");
  });

  it("idempotent — scan dua kali terhadap site yang sama tidak error, hasil akhir tetap INACTIVE", async () => {
    const fixture = await seedTenantFixture();
    const site = await seedProjectSite(fixture.tenantId, fixture.userId, { endDate: new Date("2026-01-01") });

    await service.scan(new Date("2026-06-01"));
    await expect(service.scan(new Date("2026-06-01"))).resolves.not.toThrow();

    const reloaded = await adminPrisma.site.findUniqueOrThrow({ where: { id: site.id } });
    expect(reloaded.status).toBe("INACTIVE");
  });

  it("dua tenant berbeda diproses independen (bootstrap cross-tenant tetap RLS penuh per tenant)", async () => {
    const fixtureA = await seedTenantFixture();
    const fixtureB = await seedTenantFixture();
    const siteA = await seedProjectSite(fixtureA.tenantId, fixtureA.userId, { endDate: new Date("2026-01-01") });
    const siteB = await seedProjectSite(fixtureB.tenantId, fixtureB.userId, { endDate: new Date("2027-01-01") });

    await service.scan(new Date("2026-06-01"));

    const [reloadedA, reloadedB] = await Promise.all([
      adminPrisma.site.findUniqueOrThrow({ where: { id: siteA.id } }),
      adminPrisma.site.findUniqueOrThrow({ where: { id: siteB.id } }),
    ]);
    expect(reloadedA.status).toBe("INACTIVE");
    expect(reloadedB.status).toBe("ACTIVE");
  });
});
