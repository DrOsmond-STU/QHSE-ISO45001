import { INestApplication, NotFoundException } from "@nestjs/common";
import { NumberingService } from "../../src/platform/numbering/numbering.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, createTestApp, seedTenantFixture } from "./test-helpers";

describe("NumberingService — numbering_configs belum di-setup / isolasi tenant", () => {
  let app: INestApplication;
  let service: NumberingService;

  beforeAll(async () => {
    app = await createTestApp();
    service = app.get(NumberingService);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  it("generateNext untuk module_code tanpa numbering_configs -> NotFoundException eksplisit, bukan crash generik", async () => {
    const fixture = await seedTenantFixture();

    await expect(
      tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
        service.generateNext("MODULE_YANG_BELUM_ADA_CONFIGNYA"),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it("tenant lain tidak bisa 'pinjam' numbering_configs tenant lain (RLS fail closed, bukan cuma unauthorized di layer aplikasi)", async () => {
    const fixtureA = await seedTenantFixture();
    const fixtureB = await seedTenantFixture();
    await adminPrisma.numberingConfig.create({
      data: {
        tenantId: fixtureA.tenantId,
        moduleCode: "ONLY_TENANT_A",
        pattern: "{PREFIX}/{SEQ:2}",
        prefix: "A",
        resetPeriod: "NEVER",
        scopeLevel: "TENANT",
      },
    });

    await expect(
      tenantContextStorage.run({ tenantId: fixtureB.tenantId }, () => service.generateNext("ONLY_TENANT_A")),
    ).rejects.toThrow(NotFoundException);
  });

  it("tanpa tenant context sama sekali -> fail closed dengan Error eksplisit, bukan generate nomor lintas-tenant", async () => {
    await expect(service.generateNext("ANY_MODULE")).rejects.toThrow(/Tenant context tidak ditemukan/);
  });
});
