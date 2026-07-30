import { INestApplication } from "@nestjs/common";
import { NumberingService } from "../../src/platform/numbering/numbering.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, createTestApp, seedNumberingConfig, seedTenantFixture } from "./test-helpers";

// TESTING §6 — skenario paling kritis modul ini: "numbering: 10 submission
// konkuren menghasilkan 10 nomor unik tanpa duplikasi." Row lock sungguhan
// (SELECT ... FOR UPDATE) tidak bisa disimulasikan lewat fake/mock — WAJIB
// integration test terhadap Postgres asli (alasan sama dgn
// test/workflow-engine/idempotency.integration-spec.ts task 0.9).
//
// Adaptasi dari contoh kode TESTING §6 (`numberingService.generateNext('WORK_PERMIT', tenantId)`):
// tenantId TIDAK dilewatkan sebagai argumen literal — service ini mengikuti
// konvensi ambient-tenant-context yang sama dipakai WorkflowEngineService
// (task 0.9), bukan parameter eksplisit (lihat komentar banner
// numbering.service.ts). Contoh kode TESTING §6 diperlakukan sebagai
// pseudo-code ilustratif untuk skenario konkurensi, bukan kontrak signature.
describe("NumberingService — konkurensi generateNext", () => {
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

  it("10 submission konkuren menghasilkan 10 nomor unik tanpa duplikasi (TESTING §6)", async () => {
    const fixture = await seedTenantFixture();
    await seedNumberingConfig(fixture.tenantId, {
      moduleCode: "WORK_PERMIT",
      pattern: "{PREFIX}/{YYYY}/{SEQ:4}",
      prefix: "WP",
    });

    // Fire seluruhnya TANPA await satu-satu dulu — race sungguhan, bukan
    // sequential (sama pola dgn idempotency.integration-spec.ts task 0.9).
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        tenantContextStorage.run({ tenantId: fixture.tenantId }, () => service.generateNext("WORK_PERMIT")),
      ),
    );

    expect(new Set(results).size).toBe(10);
    expect(results.every((r) => /^WP\/\d{4}\/\d{4}$/.test(r))).toBe(true);

    const config = await adminPrisma.numberingConfig.findFirstOrThrow({
      where: { tenantId: fixture.tenantId, moduleCode: "WORK_PERMIT" },
    });
    expect(config.lastSequence).toBe(10);
  });

  it("dua tenant berbeda generate module_code yang SAMA secara konkuren -> counter tidak saling bentrok (RLS + row lock terpisah per tenant)", async () => {
    const fixtureA = await seedTenantFixture();
    const fixtureB = await seedTenantFixture();
    await seedNumberingConfig(fixtureA.tenantId, { moduleCode: "INCIDENT", pattern: "{PREFIX}/{SEQ:3}", prefix: "INC" });
    await seedNumberingConfig(fixtureB.tenantId, { moduleCode: "INCIDENT", pattern: "{PREFIX}/{SEQ:3}", prefix: "INC" });

    const [resultsA, resultsB] = await Promise.all([
      Promise.all(
        Array.from({ length: 5 }, () =>
          tenantContextStorage.run({ tenantId: fixtureA.tenantId }, () => service.generateNext("INCIDENT")),
        ),
      ),
      Promise.all(
        Array.from({ length: 5 }, () =>
          tenantContextStorage.run({ tenantId: fixtureB.tenantId }, () => service.generateNext("INCIDENT")),
        ),
      ),
    ]);

    expect(new Set(resultsA).size).toBe(5);
    expect(new Set(resultsB).size).toBe(5);
    // Kedua tenant sama-sama mulai dari INC/001 — counter tenant A TIDAK
    // "bocor" mempengaruhi urutan tenant B, walau nama modul sama persis.
    expect(resultsA.sort()).toEqual(["INC/001", "INC/002", "INC/003", "INC/004", "INC/005"]);
    expect(resultsB.sort()).toEqual(["INC/001", "INC/002", "INC/003", "INC/004", "INC/005"]);
  });
});
