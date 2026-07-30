import { INestApplication, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { IndustryTemplateService } from "../../src/modules/domains/organization/industry-template/industry-template.service";
import { OrganizationService } from "../../src/modules/domains/organization/organization.service";
import { INDUSTRY_TEMPLATE_SEEDS } from "../../prisma/seed-industry-templates";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, createTestApp, seedOrganizationTree, seedTenantFixture } from "./test-helpers";

// Task 1.2 — industry_templates: katalog GLOBAL (TIDAK ADA tenant_id sama
// sekali), beda fundamental dari seluruh test organization/* lain yang
// tenant-scoped. Fokus test di sini: (1) baseline seed hadir, (2) validasi
// aktif/nonaktif, (3) BUKTI EMPIRIS bisa dipanggil TANPA tenant context
// sama sekali (acceptance: dipakai setup wizard SEBELUM tenant dibuat),
// (4) wiring validasi di OrganizationService.createCompany().
describe("IndustryTemplateService (Modul 01 §5 — katalog global)", () => {
  let app: INestApplication;
  let service: IndustryTemplateService;
  let organizationService: OrganizationService;

  beforeAll(async () => {
    app = await createTestApp();
    service = app.get(IndustryTemplateService);
    organizationService = app.get(OrganizationService);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  function asUser<T>(tenantId: string, userId: string, fn: () => Promise<T>): Promise<T> {
    return tenantContextStorage.run({ tenantId, userId }, fn);
  }

  it("listActive() TANPA context apa pun mengembalikan seluruh baseline seed (dipanggil setup wizard sebelum tenant ada)", async () => {
    const templates = await service.listActive();
    const codes = templates.map((t) => t.code).sort();
    for (const seed of INDUSTRY_TEMPLATE_SEEDS) {
      expect(codes).toContain(seed.code);
    }
  });

  it("findByCode() mengembalikan template yang benar", async () => {
    const template = await service.findByCode("GENERIC");
    expect(template).not.toBeNull();
    expect(template?.name).toBe("Umum");
    expect(template?.defaultRegulatoryCodes).toBeInstanceOf(Array);
  });

  it("getActiveOrThrow() lolos untuk template aktif", async () => {
    const generic = await service.findByCode("GENERIC");
    const resolved = await service.getActiveOrThrow(generic!.id);
    expect(resolved.id).toBe(generic!.id);
  });

  it("getActiveOrThrow() menolak UUID yang tidak ada (fail closed)", async () => {
    await expect(service.getActiveOrThrow(randomUUID())).rejects.toThrow(NotFoundException);
  });

  it("getActiveOrThrow() menolak template yang sudah dinonaktifkan (deactivate())", async () => {
    const code = `TEST-DEACT-${randomUUID().slice(0, 8)}`;
    const created = await service.create({ code, name: "Test Deactivate" });
    await service.deactivate(created.id);

    await expect(service.getActiveOrThrow(created.id)).rejects.toThrow(NotFoundException);
    const refetched = await service.findByCode(code);
    expect(refetched?.isActive).toBe(false);
  });

  it("create() menolak code duplikat (unique constraint -> ConflictException)", async () => {
    const code = `TEST-DUP-${randomUUID().slice(0, 8)}`;
    await service.create({ code, name: "Pertama" });
    await expect(service.create({ code, name: "Kedua" })).rejects.toThrow();
  });

  it("create() TANPA context apa pun tetap berhasil, actor_user_id tercatat NULL di audit log (sesuai desain: bukan aksi milik satu tenant)", async () => {
    const code = `TEST-NOCTX-${randomUUID().slice(0, 8)}`;
    const created = await service.create({ code, name: "Tanpa Context" });

    const auditRows = await adminPrisma.$queryRaw<Array<{ tenant_id: string | null; actor_user_id: string | null }>>`
      SELECT tenant_id, actor_user_id FROM system_audit_logs
      WHERE entity_type = 'industry_templates' AND entity_id = ${created.id}::uuid AND action = 'INSERT'
    `;
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0].tenant_id).toBeNull();
    expect(auditRows[0].actor_user_id).toBeNull();
  });

  it("create() DI DALAM context tenant (mis. dipanggil operator Super Admin Platform yang kebetulan sedang impersonate tenant) tetap tenant_id NULL di audit, TAPI actor_user_id ikut tercatat", async () => {
    const fixture = await seedTenantFixture();
    const code = `TEST-WITHCTX-${randomUUID().slice(0, 8)}`;

    const created = await asUser(fixture.tenantId, fixture.userId, () => service.create({ code, name: "Dengan Context" }));

    const auditRows = await adminPrisma.$queryRaw<Array<{ tenant_id: string | null; actor_user_id: string | null }>>`
      SELECT tenant_id, actor_user_id FROM system_audit_logs
      WHERE entity_type = 'industry_templates' AND entity_id = ${created.id}::uuid AND action = 'INSERT'
    `;
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0].tenant_id).toBeNull();
    expect(auditRows[0].actor_user_id).toBe(fixture.userId);
  });

  it("OrganizationService.createCompany() dengan industryTemplateId valid -> lolos", async () => {
    const fixture = await seedTenantFixture();
    const generic = await service.findByCode("GENERIC");

    const company = await asUser(fixture.tenantId, fixture.userId, () =>
      organizationService.createCompany({
        companyCode: `CO-${randomUUID().slice(0, 8)}`,
        legalName: "PT Company Dengan Template",
        displayName: "Company Dengan Template",
        industryTemplateId: generic!.id,
      }),
    );
    expect(company.industryTemplateId).toBe(generic!.id);
  });

  it("OrganizationService.createCompany() dengan industryTemplateId tidak ada -> ditolak fail closed (BUKAN tersimpan sebagai UUID yatim)", async () => {
    const fixture = await seedTenantFixture();

    await expect(
      asUser(fixture.tenantId, fixture.userId, () =>
        organizationService.createCompany({
          companyCode: `CO-${randomUUID().slice(0, 8)}`,
          legalName: "PT Company Template Salah",
          displayName: "Company Template Salah",
          industryTemplateId: randomUUID(),
        }),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it("OrganizationService.createCompany() dengan industryTemplateId yang sudah dinonaktifkan -> ditolak", async () => {
    const fixture = await seedTenantFixture();
    const code = `TEST-COINACT-${randomUUID().slice(0, 8)}`;
    const template = await service.create({ code, name: "Inactive For Company" });
    await service.deactivate(template.id);

    await expect(
      asUser(fixture.tenantId, fixture.userId, () =>
        organizationService.createCompany({
          companyCode: `CO-${randomUUID().slice(0, 8)}`,
          legalName: "PT Company Template Nonaktif",
          displayName: "Company Template Nonaktif",
          industryTemplateId: template.id,
        }),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it("seedOrganizationTree() fixture tetap jalan tanpa industryTemplateId (field opsional, tidak meregresi test 1.1 lain)", async () => {
    const fixture = await seedTenantFixture();
    const tree = await seedOrganizationTree(fixture.tenantId, fixture.userId);
    expect(tree.company.industryTemplateId).toBeNull();
  });
});
