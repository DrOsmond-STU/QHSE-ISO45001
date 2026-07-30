import { INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { SsoMappingService } from "../../src/modules/domains/user-role/sso-mapping.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, createTestApp, seedTenantFixture } from "./test-helpers";

describe("SsoMappingService (Modul 02 §5)", () => {
  let app: INestApplication;
  let service: SsoMappingService;

  beforeAll(async () => {
    app = await createTestApp();
    service = app.get(SsoMappingService);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  function asUser<T>(tenantId: string, userId: string, fn: () => Promise<T>): Promise<T> {
    return tenantContextStorage.run({ tenantId, userId }, fn);
  }

  it("createMapping() default autoProvision=FALSE (PRD §13 Open Question #4)", async () => {
    const fixture = await seedTenantFixture();
    const mapping = await asUser(fixture.tenantId, fixture.userId, () =>
      service.createMapping({ idpProvider: "AZURE_AD", externalSubjectId: randomUUID() }),
    );
    expect(mapping.autoProvision).toBe(false);
    expect(mapping.status).toBe("ACTIVE");
    expect(mapping.userId).toBeNull();
  });

  it("resolveByExternalSubject() menemukan mapping yang sudah ada", async () => {
    const fixture = await seedTenantFixture();
    const externalSubjectId = `subj-${randomUUID()}`;
    const created = await asUser(fixture.tenantId, fixture.userId, () =>
      service.createMapping({ idpProvider: "GOOGLE_WORKSPACE", externalSubjectId }),
    );

    const resolved = await asUser(fixture.tenantId, fixture.userId, () =>
      service.resolveByExternalSubject("GOOGLE_WORKSPACE", externalSubjectId),
    );
    expect(resolved?.id).toBe(created.id);
  });

  it("resolveByExternalSubject() mengembalikan null kalau tidak ditemukan", async () => {
    const fixture = await seedTenantFixture();
    const resolved = await asUser(fixture.tenantId, fixture.userId, () =>
      service.resolveByExternalSubject("SAML_GENERIC", `nonexistent-${randomUUID()}`),
    );
    expect(resolved).toBeNull();
  });

  it("unique constraint (tenant, idp_provider, external_subject_id) — duplikat ditolak", async () => {
    const fixture = await seedTenantFixture();
    const externalSubjectId = `dup-subj-${randomUUID()}`;
    await asUser(fixture.tenantId, fixture.userId, () =>
      service.createMapping({ idpProvider: "OIDC_GENERIC", externalSubjectId }),
    );

    await expect(
      asUser(fixture.tenantId, fixture.userId, () =>
        service.createMapping({ idpProvider: "OIDC_GENERIC", externalSubjectId }),
      ),
    ).rejects.toThrow();
  });

  it("linkUser() mengaitkan mapping ke user + mengisi lastSsoLoginAt", async () => {
    const fixture = await seedTenantFixture();
    const mapping = await asUser(fixture.tenantId, fixture.userId, () =>
      service.createMapping({ idpProvider: "AZURE_AD", externalSubjectId: randomUUID() }),
    );

    const linked = await asUser(fixture.tenantId, fixture.userId, () => service.linkUser(mapping.id, fixture.userId));
    expect(linked.userId).toBe(fixture.userId);
    expect(linked.lastSsoLoginAt).not.toBeNull();
  });

  it("deactivateMapping() mengubah status jadi INACTIVE", async () => {
    const fixture = await seedTenantFixture();
    const mapping = await asUser(fixture.tenantId, fixture.userId, () =>
      service.createMapping({ idpProvider: "SAML_GENERIC", externalSubjectId: randomUUID() }),
    );
    const deactivated = await asUser(fixture.tenantId, fixture.userId, () => service.deactivateMapping(mapping.id));
    expect(deactivated.status).toBe("INACTIVE");
  });

  it("audit trigger: create sso_mappings tercatat dengan tenant_id benar", async () => {
    const fixture = await seedTenantFixture();
    const mapping = await asUser(fixture.tenantId, fixture.userId, () =>
      service.createMapping({ idpProvider: "AZURE_AD", externalSubjectId: randomUUID() }),
    );

    const auditRows = await adminPrisma.$queryRaw<Array<{ tenant_id: string | null; action: string }>>`
      SELECT tenant_id, action FROM system_audit_logs
      WHERE entity_type = 'sso_mappings' AND entity_id = ${mapping.id}::uuid
    `;
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0].tenant_id).toBe(fixture.tenantId);
  });
});
