import { INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { NumberingService } from "../../src/platform/numbering/numbering.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, createTestApp, seedNumberingConfig, seedTenantFixture } from "./test-helpers";

// Master PRD §10 — scope_level menentukan "level di mana counter direset
// ulang". scopeId beyond PRD literal (lihat banner comment schema.prisma
// "Task 0.10") — partisi counter per site/company nyata cuma bisa terjadi
// kalau tiap scope punya baris numbering_configs sendiri.
describe("NumberingService — partisi counter per scope", () => {
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

  it("scope_level SITE: dua site berbeda punya counter independen, keduanya mulai dari 1", async () => {
    const fixture = await seedTenantFixture();
    const siteA = randomUUID();
    const siteB = randomUUID();
    await seedNumberingConfig(fixture.tenantId, {
      moduleCode: "INCIDENT",
      pattern: "{PREFIX}/{SEQ:3}",
      prefix: "INC",
      scopeLevel: "SITE",
      scopeId: siteA,
    });
    await seedNumberingConfig(fixture.tenantId, {
      moduleCode: "INCIDENT",
      pattern: "{PREFIX}/{SEQ:3}",
      prefix: "INC",
      scopeLevel: "SITE",
      scopeId: siteB,
    });

    const numberA1 = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
      service.generateNext("INCIDENT", { scopeId: siteA }),
    );
    const numberB1 = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
      service.generateNext("INCIDENT", { scopeId: siteB }),
    );
    const numberA2 = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
      service.generateNext("INCIDENT", { scopeId: siteA }),
    );

    expect(numberA1).toBe("INC/001");
    expect(numberB1).toBe("INC/001"); // site lain, counter independen -> juga mulai dari 1
    expect(numberA2).toBe("INC/002");
  });

  it("scope_level TENANT (scopeId kosong) terpisah dari config ber-scope SITE untuk module_code yang sama", async () => {
    const fixture = await seedTenantFixture();
    const siteId = randomUUID();
    await seedNumberingConfig(fixture.tenantId, {
      moduleCode: "AUDIT",
      pattern: "{PREFIX}/{SEQ:2}",
      prefix: "AUD-SITE",
      scopeLevel: "SITE",
      scopeId: siteId,
    });
    await seedNumberingConfig(fixture.tenantId, {
      moduleCode: "AUDIT",
      pattern: "{PREFIX}/{SEQ:2}",
      prefix: "AUD-TENANT",
      scopeLevel: "TENANT",
      scopeId: null,
    });

    const siteNumber = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
      service.generateNext("AUDIT", { scopeId: siteId }),
    );
    const tenantNumber = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () => service.generateNext("AUDIT"));

    expect(siteNumber).toBe("AUD-SITE/01");
    expect(tenantNumber).toBe("AUD-TENANT/01");
  });

  it("token custom di luar {PREFIX}/{YYYY}/{MM}/{QUARTER}/{YYYYMMDD}/{SEQ:n} diambil dari variables (mis. {SITE_CODE} — Modul 01 belum ada di Phase 0)", async () => {
    const fixture = await seedTenantFixture();
    await seedNumberingConfig(fixture.tenantId, {
      moduleCode: "DMS",
      pattern: "{PREFIX}/{SITE_CODE}/{SEQ:3}",
      prefix: "DOC",
    });

    const result = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
      service.generateNext("DMS", { variables: { SITE_CODE: "JKT-01" } }),
    );

    expect(result).toBe("DOC/JKT-01/001");
  });
});
