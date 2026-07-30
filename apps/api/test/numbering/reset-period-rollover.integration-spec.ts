import { INestApplication } from "@nestjs/common";
import { NumberingService } from "../../src/platform/numbering/numbering.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, createTestApp, seedNumberingConfig, seedTenantFixture } from "./test-helpers";

// Master PRD §10 — reset_period YEARLY/MONTHLY/NEVER. lastPeriodKey beyond
// PRD literal (lihat banner comment schema.prisma "Task 0.10") — tanpa itu
// rollover tidak bisa dideteksi sama sekali (last_sequence akan terus
// bertambah lintas tahun/bulan, bukan reset seperti nama enum-nya).
describe("NumberingService — reset_period rollover", () => {
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

  it("YEARLY: periode berbeda dari lastPeriodKey tersimpan -> sequence reset ke 1, BUKAN lanjut", async () => {
    const fixture = await seedTenantFixture();
    await seedNumberingConfig(fixture.tenantId, {
      moduleCode: "CAPA",
      pattern: "{PREFIX}/{YYYY}/{SEQ:4}",
      prefix: "CAPA",
      resetPeriod: "YEARLY",
      lastSequence: 47, // seolah-olah tahun lalu sudah sampai 0047
      lastPeriodKey: "2020",
    });

    const result = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () => service.generateNext("CAPA"));

    expect(result).toMatch(/^CAPA\/\d{4}\/0001$/);
    expect(result).not.toContain("/2020/");
  });

  it("YEARLY: periode SAMA dengan lastPeriodKey tersimpan -> lanjut dari lastSequence, tidak reset", async () => {
    const fixture = await seedTenantFixture();
    const currentYear = String(new Date().getUTCFullYear());
    await seedNumberingConfig(fixture.tenantId, {
      moduleCode: "CAPA",
      pattern: "{PREFIX}/{YYYY}/{SEQ:4}",
      prefix: "CAPA",
      resetPeriod: "YEARLY",
      lastSequence: 47,
      lastPeriodKey: currentYear,
    });

    const result = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () => service.generateNext("CAPA"));

    expect(result).toBe(`CAPA/${currentYear}/0048`);
  });

  it("NEVER: lastPeriodKey selalu null, sequence tidak pernah reset lintas panggilan", async () => {
    const fixture = await seedTenantFixture();
    await seedNumberingConfig(fixture.tenantId, {
      moduleCode: "ASSET",
      pattern: "{PREFIX}/{SEQ:3}",
      prefix: "AST",
      resetPeriod: "NEVER",
    });

    const first = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () => service.generateNext("ASSET"));
    const second = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () => service.generateNext("ASSET"));

    expect(first).toBe("AST/001");
    expect(second).toBe("AST/002");
  });
});
