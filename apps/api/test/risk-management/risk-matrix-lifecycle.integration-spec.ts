import { ConflictException, INestApplication, NotFoundException } from "@nestjs/common";
import { HazardRegisterService } from "../../src/modules/domains/risk-management/matrix/hazard-register.service";
import { RiskMatrixBootstrapService } from "../../src/modules/domains/risk-management/matrix/risk-matrix-bootstrap.service";
import {
  CreateRiskMatrixConfigInput,
  RiskMatrixConfigService,
} from "../../src/modules/domains/risk-management/matrix/risk-matrix-config.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, createTestApp, flushTestRedis, seedSite, seedTenantFixture } from "./test-helpers";

/**
 * Task 3.1 (Modul 05 Risk Management — matriks risiko konfigurabel) —
 * cakupan: BR-09 (versioning tanpa mengubah skor historis), partial unique
 * index (1 versi aktif per tenant+scope), resolveActiveConfig() 2-tier
 * fallback (scope-spesifik -> ALL), RiskMatrixBootstrapService default 5x5
 * idempotent, HazardRegisterService CRUD+retire, isolasi tenant RLS.
 */
describe("Risk Management — Modul 05 matriks (task 3.1)", () => {
  let app: INestApplication;
  let configService: RiskMatrixConfigService;
  let bootstrapService: RiskMatrixBootstrapService;
  let hazardService: HazardRegisterService;

  beforeAll(async () => {
    await flushTestRedis();
    app = await createTestApp();
    configService = app.get(RiskMatrixConfigService);
    bootstrapService = app.get(RiskMatrixBootstrapService);
    hazardService = app.get(HazardRegisterService);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  function minimalMatrixInput(scope: CreateRiskMatrixConfigInput["applicableModuleScope"] = "HIRA"): CreateRiskMatrixConfigInput {
    return {
      name: "Matriks Uji 2x2",
      applicableModuleScope: scope,
      likelihoodLevels: 2,
      severityLevels: 2,
      levels: [
        { axis: "LIKELIHOOD", levelValue: 1, label: "Rendah" },
        { axis: "LIKELIHOOD", levelValue: 2, label: "Tinggi" },
        { axis: "SEVERITY", levelValue: 1, label: "Ringan" },
        { axis: "SEVERITY", levelValue: 2, label: "Berat" },
      ],
      cells: [
        { likelihoodValue: 1, severityValue: 1, riskScore: 1, riskLevel: "LOW", colorCode: "#4CAF50" },
        { likelihoodValue: 1, severityValue: 2, riskScore: 2, riskLevel: "LOW", colorCode: "#4CAF50" },
        { likelihoodValue: 2, severityValue: 1, riskScore: 2, riskLevel: "LOW", colorCode: "#4CAF50" },
        { likelihoodValue: 2, severityValue: 2, riskScore: 4, riskLevel: "EXTREME", colorCode: "#F44336" },
      ],
    };
  }

  describe("RiskMatrixConfigService.create()", () => {
    it("membuat config+levels+cells sekaligus, version=1, isActive=true", async () => {
      const fixture = await seedTenantFixture();
      const config = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        configService.create(minimalMatrixInput("HIRA")),
      );
      expect(config.version).toBe(1);
      expect(config.isActive).toBe(true);

      const withGrid = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        configService.getById(config.id),
      );
      expect(withGrid.levels).toHaveLength(4);
      expect(withGrid.cells).toHaveLength(4);
    });

    it("create() kedua utk scope yang sama (masih aktif) ditolak ConflictException (partial unique index)", async () => {
      const fixture = await seedTenantFixture();
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        configService.create(minimalMatrixInput("JSA")),
      );
      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
          configService.create(minimalMatrixInput("JSA")),
        ),
      ).rejects.toThrow(ConflictException);
    });

    it("dua tenant BERBEDA boleh masing-masing punya 1 config aktif utk scope yang sama (RLS-scoped, bukan global)", async () => {
      const tenantA = await seedTenantFixture();
      const tenantB = await seedTenantFixture();
      await tenantContextStorage.run({ tenantId: tenantA.tenantId, userId: tenantA.userId }, () =>
        configService.create(minimalMatrixInput("HIRADC")),
      );
      const configB = await tenantContextStorage.run({ tenantId: tenantB.tenantId, userId: tenantB.userId }, () =>
        configService.create(minimalMatrixInput("HIRADC")),
      );
      expect(configB.version).toBe(1);
    });
  });

  describe("RiskMatrixConfigService.createNewVersion() — BR-09", () => {
    it("baris lama isActive->false TANPA kolom lain berubah, baris baru version+1 aktif", async () => {
      const fixture = await seedTenantFixture();
      const v1 = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        configService.create(minimalMatrixInput("CORPORATE_RISK")),
      );

      const v2Input = minimalMatrixInput("CORPORATE_RISK");
      const v2 = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        configService.createNewVersion(v1.id, { name: "Matriks Uji 2x2 v2", levels: v2Input.levels, cells: v2Input.cells }),
      );

      expect(v2.version).toBe(2);
      expect(v2.isActive).toBe(true);
      expect(v2.applicableModuleScope).toBe("CORPORATE_RISK");

      const v1After = await adminPrisma.riskMatrixConfig.findUniqueOrThrow({ where: { id: v1.id } });
      expect(v1After.isActive).toBe(false);
      expect(v1After.name).toBe(v1.name);
      expect(v1After.version).toBe(1);

      // Baris lama TETAP tersimpan lengkap dgn levels/cells-nya sendiri —
      // skor historis tidak pernah berubah retroaktif.
      const v1Cells = await adminPrisma.riskMatrixCell.findMany({ where: { riskMatrixConfigId: v1.id } });
      expect(v1Cells).toHaveLength(4);
    });

    it("createNewVersion() atas config yang SUDAH tidak aktif ditolak", async () => {
      const fixture = await seedTenantFixture();
      const v1 = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        configService.create(minimalMatrixInput("ALL")),
      );
      const v2Input = minimalMatrixInput("ALL");
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        configService.createNewVersion(v1.id, { name: "v2", levels: v2Input.levels, cells: v2Input.cells }),
      );

      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
          configService.createNewVersion(v1.id, { name: "v3-invalid", levels: v2Input.levels, cells: v2Input.cells }),
        ),
      ).rejects.toThrow();
    });
  });

  describe("RiskMatrixConfigService.resolveActiveConfig() — 2-tier fallback", () => {
    it("scope-spesifik (HIRA) menang atas ALL kalau keduanya aktif", async () => {
      const fixture = await seedTenantFixture();
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        configService.create(minimalMatrixInput("ALL")),
      );
      const hiraConfig = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        configService.create(minimalMatrixInput("HIRA")),
      );

      const resolved = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        configService.resolveActiveConfig("HIRA"),
      );
      expect(resolved.id).toBe(hiraConfig.id);
    });

    it("fallback ke ALL kalau tidak ada config scope-spesifik", async () => {
      const fixture = await seedTenantFixture();
      const allConfig = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        configService.create(minimalMatrixInput("ALL")),
      );

      const resolved = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        configService.resolveActiveConfig("JSA"),
      );
      expect(resolved.id).toBe(allConfig.id);
    });

    it("throw NotFoundException kalau tidak ada config aktif sama sekali", async () => {
      const fixture = await seedTenantFixture();
      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => configService.resolveActiveConfig("HIRA")),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("RiskMatrixBootstrapService.ensureDefaultMatrix()", () => {
    it("lazy-create matriks default 5x5 (25 cells, 10 levels) saat belum ada", async () => {
      const fixture = await seedTenantFixture();
      const config = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        bootstrapService.ensureDefaultMatrix("ALL"),
      );
      expect(config.likelihoodLevels).toBe(5);
      expect(config.severityLevels).toBe(5);

      const cells = await adminPrisma.riskMatrixCell.findMany({ where: { riskMatrixConfigId: config.id } });
      const levels = await adminPrisma.riskMatrixLevel.findMany({ where: { riskMatrixConfigId: config.id } });
      expect(cells).toHaveLength(25);
      expect(levels).toHaveLength(10);
    });

    it("idempotent — panggilan kedua mengembalikan baris yang SAMA, tidak duplikat", async () => {
      const fixture = await seedTenantFixture();
      const first = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        bootstrapService.ensureDefaultMatrix("HIRA"),
      );
      const second = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        bootstrapService.ensureDefaultMatrix("HIRA"),
      );
      expect(second.id).toBe(first.id);

      const count = await adminPrisma.riskMatrixConfig.count({ where: { tenantId: fixture.tenantId, applicableModuleScope: "HIRA" } });
      expect(count).toBe(1);
    });
  });

  describe("HazardRegisterService", () => {
    it("create -> listActive -> update -> retire (soft delete)", async () => {
      const fixture = await seedTenantFixture();
      const hazard = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        hazardService.create({ hazardCategory: "MECHANICAL", hazardDescription: "Mesin berputar tanpa pelindung" }),
      );
      expect(hazard.status).toBe("ACTIVE");

      const active = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => hazardService.listActive());
      expect(active.map((h) => h.id)).toContain(hazard.id);

      const updated = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        hazardService.update(hazard.id, { potentialConsequence: "Cedera tangan/amputasi" }),
      );
      expect(updated.potentialConsequence).toBe("Cedera tangan/amputasi");

      const retired = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => hazardService.retire(hazard.id));
      expect(retired.status).toBe("INACTIVE");
      expect(retired.deletedAt).not.toBeNull();

      const activeAfterRetire = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        hazardService.listActive(),
      );
      expect(activeAfterRetire.map((h) => h.id)).not.toContain(hazard.id);
    });

    it("listActive(siteId) mengembalikan hazard generik (siteId NULL) DAN yang spesifik site itu", async () => {
      const fixture = await seedTenantFixture();
      const { siteId } = await seedSite(fixture.tenantId, fixture.userId);
      const generic = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        hazardService.create({ hazardCategory: "CHEMICAL", hazardDescription: "Paparan bahan kimia generik" }),
      );
      const siteSpecific = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        hazardService.create({ hazardCategory: "ELECTRICAL", hazardDescription: "Bahaya listrik spesifik site", siteId }),
      );

      const forSite = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => hazardService.listActive(siteId));
      const ids = forSite.map((h) => h.id);
      expect(ids).toContain(generic.id);
      expect(ids).toContain(siteSpecific.id);
    });
  });

  describe("Isolasi tenant (RLS)", () => {
    it("risk_matrix_configs tenant A tidak terlihat dari context tenant B", async () => {
      const tenantA = await seedTenantFixture();
      const tenantB = await seedTenantFixture();
      const config = await tenantContextStorage.run({ tenantId: tenantA.tenantId, userId: tenantA.userId }, () =>
        configService.create(minimalMatrixInput("HIRA")),
      );

      await expect(
        tenantContextStorage.run({ tenantId: tenantB.tenantId, userId: tenantB.userId }, () => configService.getById(config.id)),
      ).rejects.toThrow();
    });

    it("hazard_register tenant A tidak terlihat dari context tenant B", async () => {
      const tenantA = await seedTenantFixture();
      const tenantB = await seedTenantFixture();
      const hazard = await tenantContextStorage.run({ tenantId: tenantA.tenantId, userId: tenantA.userId }, () =>
        hazardService.create({ hazardCategory: "OTHER", hazardDescription: "Rahasia tenant A" }),
      );

      await expect(
        tenantContextStorage.run({ tenantId: tenantB.tenantId, userId: tenantB.userId }, () => hazardService.getById(hazard.id)),
      ).rejects.toThrow();
    });
  });
});
