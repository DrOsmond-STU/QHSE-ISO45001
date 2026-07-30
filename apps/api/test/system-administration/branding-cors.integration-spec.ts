import { BadRequestException, ConflictException, INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { TenantBrandingService } from "../../src/modules/domains/system-administration/branding/tenant-branding.service";
import { TenantCorsResolverService } from "../../src/platform/tenancy/tenant-cors-resolver.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, createTestApp, seedTenantFixture } from "../auth/test-helpers";

// TDD §16 — "CORS: whitelist origin per tenant custom domain..., tidak
// wildcard." tenant_branding_configs.custom_domain adalah sumber whitelist
// (bukan daftar statis) — dibuktikan lewat TenantBrandingService.upsert()
// (nulis custom_domain) diikuti TenantCorsResolverService.isOriginAllowed()
// (baca lintas tenant via koneksi admin, lihat banner comment kelasnya).
describe("TenantBrandingService & TenantCorsResolverService — TDD §16 (Modul 31)", () => {
  let app: INestApplication;
  let brandingService: TenantBrandingService;
  let corsResolver: TenantCorsResolverService;

  beforeAll(async () => {
    app = await createTestApp();
    brandingService = app.get(TenantBrandingService);
    corsResolver = app.get(TenantCorsResolverService);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  describe("TenantBrandingService.upsert()", () => {
    it("membuat baris tenant_branding_configs, getByTenantId() membaca balik", async () => {
      const fixture = await seedTenantFixture();
      const customDomain = `qhse-${randomUUID().slice(0, 8)}.example.com`;

      const created = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        brandingService.upsert({ displayName: "Acme QHSE", primaryColor: "#1E40AF", customDomain }),
      );
      expect(created.tenantId).toBe(fixture.tenantId);
      expect(created.customDomain).toBe(customDomain);
      expect(created.createdBy).toBe(fixture.userId);

      const fetched = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        brandingService.getByTenantId(),
      );
      expect(fetched?.displayName).toBe("Acme QHSE");
    });

    it("upsert() kedua utk tenant yang SAMA meng-update baris yang sama, bukan duplikat", async () => {
      const fixture = await seedTenantFixture();
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        brandingService.upsert({ displayName: "Nama Awal" }),
      );
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        brandingService.upsert({ displayName: "Nama Baru" }),
      );

      const rows = await adminPrisma.tenantBrandingConfig.findMany({ where: { tenantId: fixture.tenantId } });
      expect(rows).toHaveLength(1);
      expect(rows[0].displayName).toBe("Nama Baru");
    });

    it("menolak custom_domain yang sudah dipakai TENANT LAIN (ConflictException)", async () => {
      const fixtureA = await seedTenantFixture();
      const fixtureB = await seedTenantFixture();
      const customDomain = `taken-${randomUUID().slice(0, 8)}.example.com`;

      await tenantContextStorage.run({ tenantId: fixtureA.tenantId, userId: fixtureA.userId }, () =>
        brandingService.upsert({ customDomain }),
      );

      await expect(
        tenantContextStorage.run({ tenantId: fixtureB.tenantId, userId: fixtureB.userId }, () =>
          brandingService.upsert({ customDomain }),
        ),
      ).rejects.toThrow(ConflictException);
    });

    it("menolak format custom_domain tidak valid (BadRequestException)", async () => {
      const fixture = await seedTenantFixture();
      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
          brandingService.upsert({ customDomain: "bukan domain valid!!" }),
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("TenantCorsResolverService.isOriginAllowed()", () => {
    it("WEB_ORIGIN platform default -> selalu allowed (fast path, tanpa query DB)", async () => {
      const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
      await expect(corsResolver.isOriginAllowed(webOrigin)).resolves.toBe(true);
    });

    it("custom_domain tenant yang SUDAH terdaftar -> allowed", async () => {
      const fixture = await seedTenantFixture();
      const customDomain = `resolver-${randomUUID().slice(0, 8)}.example.com`;
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        brandingService.upsert({ customDomain }),
      );

      await expect(corsResolver.isOriginAllowed(`https://${customDomain}`)).resolves.toBe(true);
    });

    it("origin dgn hostname yang TIDAK terdaftar di tenant manapun -> ditolak", async () => {
      await expect(corsResolver.isOriginAllowed(`https://tidak-dikenal-${randomUUID()}.example.com`)).resolves.toBe(false);
    });

    it("origin bukan URL valid -> ditolak (fail-safe, bukan throw)", async () => {
      await expect(corsResolver.isOriginAllowed("bukan-url")).resolves.toBe(false);
    });
  });

  describe("CORS header end-to-end (main.ts app.enableCors)", () => {
    it("request dgn Origin custom_domain terdaftar -> Access-Control-Allow-Origin merefleksikan origin tsb", async () => {
      const fixture = await seedTenantFixture();
      const customDomain = `e2e-cors-${randomUUID().slice(0, 8)}.example.com`;
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        brandingService.upsert({ customDomain }),
      );
      const origin = `https://${customDomain}`;

      const res = await request(app.getHttpServer()).get("/platform/tenancy-smoke-test").set("Origin", origin);

      expect(res.headers["access-control-allow-origin"]).toBe(origin);
    });

    it("request dgn Origin yang TIDAK terdaftar -> Access-Control-Allow-Origin TIDAK diset (bukan wildcard)", async () => {
      const origin = `https://tidak-terdaftar-${randomUUID()}.example.com`;

      const res = await request(app.getHttpServer()).get("/platform/tenancy-smoke-test").set("Origin", origin);

      expect(res.headers["access-control-allow-origin"]).not.toBe(origin);
      expect(res.headers["access-control-allow-origin"]).not.toBe("*");
    });
  });
});
