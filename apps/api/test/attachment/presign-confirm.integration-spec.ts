import { BadRequestException, INestApplication, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AttachmentScanJobPayload } from "../../src/platform/attachment/attachment-scan-job.types";
import { AttachmentQueueService } from "../../src/platform/attachment/attachment-queue.service";
import { AttachmentService } from "../../src/platform/attachment/attachment.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, createTestApp, finishTestApp, seedTenantFixture, seedUserInTenant, testingModuleBuilder } from "./test-helpers";

// TDD §11 — alur upload presigned URL: presign() STATELESS -> upload
// LANGSUNG ke storage (disimulasikan lewat fetch() PUT persis browser,
// bukan lewat backend) -> confirm() HEAD storage lalu tulis DB. Terhadap
// MinIO SUNGGUHAN (.local-minio/, bukan mock) — konsisten dengan pola
// "no mock utk infra lokal yang tersedia" di seluruh proyek ini.
describe("AttachmentService — presign + confirm", () => {
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

  /**
   * Verifikasi "job masuk attachment-scan queue dengan payload benar" pakai
   * DI overrideProvider(AttachmentQueueService) — spy yang MEREKAM
   * pemanggilan, BUKAN inspeksi ulang state BullMQ/Redis sungguhan
   * (getJobs()) setelahnya. Sengaja BUKAN pola inspector-Queue yang dipakai
   * test lain di proyek ini (mis. workflow-sla-queue.integration-spec.ts
   * task 0.9) — pola itu RENTAN race kalau ADA worker sungguhan yang
   * kebetulan aktif mendengarkan queue yang sama (worker punya sesi lain
   * yang jalan bersamaan di folder proyek ini, atau proses verifikasi
   * manual sebelumnya) langsung mengonsumsi+menghapus job
   * (`removeOnComplete: true`) sebelum inspeksi kita sempat jalan — false
   * negative yang TIDAK mencerminkan bug produksi (sudah dibuktikan
   * berulang kali via debugging manual). Spy DI menghindari race ini
   * SELURUHNYA, tanpa perlu tahu/mengontrol ada-tidaknya worker lain.
   */
  it("alur lengkap: presign -> upload langsung ke storage -> confirm -> attachments row PENDING_SCAN + AttachmentQueueService.enqueueScan() dipanggil dengan payload benar", async () => {
    const recordedCalls: AttachmentScanJobPayload[] = [];
    const spyQueueService: Pick<AttachmentQueueService, "enqueueScan"> = {
      enqueueScan: async (payload) => {
        recordedCalls.push(payload);
      },
    };
    const moduleRef = await testingModuleBuilder().overrideProvider(AttachmentQueueService).useValue(spyQueueService).compile();
    const overriddenApp = await finishTestApp(moduleRef);

    try {
      const overriddenService = overriddenApp.get(AttachmentService);
      const fixture = await seedTenantFixture();
      const user = await seedUserInTenant(fixture.tenantId);
      const entityId = randomUUID();

      const presignResult = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
        overriddenService.presign({
          fileName: "laporan.pdf",
          mimeType: "application/pdf",
          fileSize: 100,
          entityType: "test_entity",
          entityId,
        }),
      );
      expect(presignResult.storageKey).toContain(fixture.tenantId);
      expect(presignResult.storageKey).toContain(presignResult.attachmentId);

      const content = "dummy pdf content untuk integration test";
      const putResponse = await fetch(presignResult.uploadUrl, {
        method: "PUT",
        body: content,
        headers: { "Content-Type": "application/pdf" },
      });
      expect(putResponse.ok).toBe(true);

      const confirmResult = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
        overriddenService.confirm(
          { attachmentId: presignResult.attachmentId, storageKey: presignResult.storageKey, fileName: "laporan.pdf", entityType: "test_entity", entityId },
          user.id,
        ),
      );
      expect(confirmResult.scanStatus).toBe("PENDING_SCAN");

      const row = await adminPrisma.attachment.findUniqueOrThrow({ where: { id: presignResult.attachmentId } });
      expect(row.fileSize).toBe(Buffer.byteLength(content));
      expect(row.mimeType).toBe("application/pdf");
      expect(row.uploadedBy).toBe(user.id);
      expect(row.scanStatus).toBe("PENDING_SCAN");

      expect(recordedCalls).toHaveLength(1);
      expect(recordedCalls[0].attachmentId).toBe(presignResult.attachmentId);
      expect(recordedCalls[0].storageKey).toBe(presignResult.storageKey);
      expect(recordedCalls[0].mimeType).toBe("application/pdf");
    } finally {
      await overriddenApp.close();
    }
  });

  it("confirm() mencatat ukuran SUNGGUHAN dari HEAD storage, BUKAN fileSize yang diklaim saat presign() (TDD §11: validasi otoritatif server-side)", async () => {
    const fixture = await seedTenantFixture();
    const user = await seedUserInTenant(fixture.tenantId);
    const entityId = randomUUID();

    // Klaim fileSize besar saat presign (lolos soft-check) tapi upload
    // sungguhan jauh lebih kecil.
    const presignResult = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
      service.presign({ fileName: "kecil.pdf", mimeType: "application/pdf", fileSize: 999_999, entityType: "test_entity", entityId }),
    );

    const realContent = "isi sungguhan jauh lebih kecil";
    await fetch(presignResult.uploadUrl, { method: "PUT", body: realContent, headers: { "Content-Type": "application/pdf" } });

    await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
      service.confirm(
        { attachmentId: presignResult.attachmentId, storageKey: presignResult.storageKey, fileName: "kecil.pdf", entityType: "test_entity", entityId },
        user.id,
      ),
    );

    const row = await adminPrisma.attachment.findUniqueOrThrow({ where: { id: presignResult.attachmentId } });
    expect(row.fileSize).toBe(Buffer.byteLength(realContent));
    expect(row.fileSize).not.toBe(999_999);
  });

  it("presign(): MIME type di luar whitelist -> BadRequestException", async () => {
    const fixture = await seedTenantFixture();
    await expect(
      tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
        service.presign({ fileName: "script.exe", mimeType: "application/x-msdownload", fileSize: 100, entityType: "test_entity", entityId: randomUUID() }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("presign(): allowedMimeTypes kustom dari caller (Phase 1+ domain module) di-hormati, bukan cuma default platform", async () => {
    const fixture = await seedTenantFixture();
    const result = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
      service.presign({
        fileName: "custom.dat",
        mimeType: "application/x-custom-format",
        fileSize: 100,
        entityType: "test_entity",
        entityId: randomUUID(),
        allowedMimeTypes: ["application/x-custom-format"],
      }),
    );
    expect(result.uploadUrl).toBeTruthy();
  });

  it("presign(): fileSize <= 0 -> BadRequestException", async () => {
    const fixture = await seedTenantFixture();
    await expect(
      tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
        service.presign({ fileName: "kosong.pdf", mimeType: "application/pdf", fileSize: 0, entityType: "test_entity", entityId: randomUUID() }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("confirm(): belum pernah upload ke storage (langsung confirm tanpa PUT) -> NotFoundException", async () => {
    const fixture = await seedTenantFixture();
    const user = await seedUserInTenant(fixture.tenantId);
    const entityId = randomUUID();

    const presignResult = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
      service.presign({ fileName: "tidak-diupload.pdf", mimeType: "application/pdf", fileSize: 100, entityType: "test_entity", entityId }),
    );

    await expect(
      tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
        service.confirm(
          { attachmentId: presignResult.attachmentId, storageKey: presignResult.storageKey, fileName: "tidak-diupload.pdf", entityType: "test_entity", entityId },
          user.id,
        ),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it("confirm(): storageKey tidak cocok attachmentId/fileName yang diklaim -> BadRequestException (mencegah klaim attachment orang lain)", async () => {
    const fixture = await seedTenantFixture();
    const user = await seedUserInTenant(fixture.tenantId);
    const entityId = randomUUID();

    await expect(
      tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
        service.confirm(
          { attachmentId: randomUUID(), storageKey: "bukan/key/yang/benar.pdf", fileName: "apapun.pdf", entityType: "test_entity", entityId },
          user.id,
        ),
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
