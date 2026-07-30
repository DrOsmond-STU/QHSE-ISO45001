import { ForbiddenException, INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AttachmentService } from "../../src/platform/attachment/attachment.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, createTestApp, seedTenantFixture, seedUserInTenant } from "./test-helpers";

// Generic RLS suite (test/rls/generic-tenant-isolation.integration-spec.ts,
// task 0.3) sudah otomatis membuktikan RLS AKTIF + "0 baris tanpa context"
// untuk `attachments` (tenant_id NOT NULL). Test di sini melengkapi bahwa
// tenant A benar-benar tidak bisa mengakses/mengunduh attachment tenant B
// lewat service sungguhan (bukan cuma raw query manual).
describe("AttachmentService — isolasi tenant (RLS)", () => {
  let app: INestApplication;
  let service: AttachmentService;

  beforeAll(async () => {
    app = await createTestApp();
    service = app.get(AttachmentService);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  it("getDownloadUrl untuk attachmentId milik tenant lain -> findUniqueOrThrow gagal (RLS: baris tidak terlihat)", async () => {
    const fixtureA = await seedTenantFixture();
    const fixtureB = await seedTenantFixture();
    const userB = await seedUserInTenant(fixtureB.tenantId);

    const presignResult = await tenantContextStorage.run({ tenantId: fixtureB.tenantId }, () =>
      service.presign({ fileName: "punya-b.pdf", mimeType: "application/pdf", fileSize: 100, entityType: "test_entity", entityId: randomUUID() }),
    );
    await fetch(presignResult.uploadUrl, { method: "PUT", body: "isi milik tenant B", headers: { "Content-Type": "application/pdf" } });
    const confirmResult = await tenantContextStorage.run({ tenantId: fixtureB.tenantId }, () =>
      service.confirm(
        {
          attachmentId: presignResult.attachmentId,
          storageKey: presignResult.storageKey,
          fileName: "punya-b.pdf",
          entityType: "test_entity",
          entityId: randomUUID(),
        },
        userB.id,
      ),
    );

    // Tenant A coba akses attachment tenant B lewat context tenant A.
    await expect(
      tenantContextStorage.run({ tenantId: fixtureA.tenantId }, () => service.getDownloadUrl(confirmResult.attachmentId)),
    ).rejects.toThrow();
  });

  // Temuan penting (dibuktikan manual via psql, lihat komentar
  // AttachmentService.confirm()): FK attachments.uploaded_by -> users
  // TIDAK cukup mencegah cross-tenant reference — Postgres TIDAK
  // menerapkan RLS pada tabel yang direferensikan constraint FK (row user
  // tenant lain tetap "ada" utk FK check walau SELECT biasa 0 baris).
  // confirm() karena itu validasi uploadedBy EKSPLISIT lewat findUnique
  // (yang TETAP tunduk RLS, beda dari FK check) sebelum insert — tanpa
  // validasi eksplisit ini, baris attachments dgn uploaded_by lintas
  // tenant akan BERHASIL dibuat diam-diam (dibuktikan reproduksi sebelum
  // fix ini ditambahkan).
  it("confirm() dengan uploadedBy dari tenant lain -> ForbiddenException eksplisit (FK constraint semata TIDAK cukup, lihat komentar)", async () => {
    const fixtureA = await seedTenantFixture();
    const fixtureB = await seedTenantFixture();
    const userB = await seedUserInTenant(fixtureB.tenantId);
    const entityId = randomUUID();

    const presignResult = await tenantContextStorage.run({ tenantId: fixtureA.tenantId }, () =>
      service.presign({ fileName: "test.pdf", mimeType: "application/pdf", fileSize: 100, entityType: "test_entity", entityId }),
    );
    await fetch(presignResult.uploadUrl, { method: "PUT", body: "isi", headers: { "Content-Type": "application/pdf" } });

    await expect(
      tenantContextStorage.run({ tenantId: fixtureA.tenantId }, () =>
        service.confirm(
          { attachmentId: presignResult.attachmentId, storageKey: presignResult.storageKey, fileName: "test.pdf", entityType: "test_entity", entityId },
          userB.id,
        ),
      ),
    ).rejects.toThrow(ForbiddenException);

    // Pastikan JUGA baris attachments TIDAK ter-buat sama sekali (bukan
    // cuma throw tapi row-nya tetap nyelip).
    const row = await adminPrisma.attachment.findUnique({ where: { id: presignResult.attachmentId } });
    expect(row).toBeNull();
  });
});
