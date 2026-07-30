import { INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { AttachmentScanService } from "../../src/platform/attachment/attachment-scan.service";
import { MALWARE_SCANNER, MalwareScanner } from "../../src/platform/attachment/malware-scanner.interface";
import { ObjectStorageService } from "../../src/platform/attachment/object-storage.service";
import { adminPrisma, createTestApp, finishTestApp, seedTenantFixture, seedUserInTenant, testingModuleBuilder } from "./test-helpers";

// TDD §11 — worker-side scan pipeline. Panggil AttachmentScanService.processScanJob()
// LANGSUNG (bukan lewat BullMQ Worker sungguhan) — konsisten dengan
// konvensi "no real external dependency di automated test" (lihat
// test/workflow-engine/workflow-sla-scan.integration-spec.ts task 0.9,
// test/notification/dead-letter.integration-spec.ts task 0.11). Storage
// (MinIO) & MalwareScanner (stub EICAR-detection, lihat
// stub-malware-scanner.ts) tetap SUNGGUHAN untuk jalur CLEAN, cuma
// orkestrasi BullMQ timing yang di-bypass demi kecepatan/determinisme test.
//
// Jalur INFECTED SENGAJA TIDAK memakai EICAR test string sungguhan lewat
// MinIO di sini (beda dari stub-malware-scanner.spec.ts yang unit-test
// deteksinya langsung di memory, aman) — ditemukan lewat debugging bahwa
// antivirus lokal (Windows Defender atau sejenis) meng-quarantine isi file
// begitu MinIO menulis EICAR ke disk (`.local-minio/data/`), menyisakan
// cuma metadata (`xl.meta`) TANPA data asli — GET berikutnya gagal
// ECONNRESET bukan karena bug kode, tapi karena AV lokal mendeteksi &
// memblokir file-nya sungguhan (perilaku yang justru MEMBUKTIKAN EICAR
// adalah signature AV asli, ironisnya mengganggu test-nya sendiri di
// environment ini). Jalur INFECTED di sini pakai DI overrideProvider
// (fault injection, pola sama test/rbac/permission-fail-closed.integration-spec.ts
// task 0.8) — scanner palsu yang SELALU lapor infected, tanpa EICAR
// sungguhan pernah menyentuh disk.
describe("AttachmentScanService — processScanJob", () => {
  let app: INestApplication;
  let scanService: AttachmentScanService;
  let storage: ObjectStorageService;

  beforeAll(async () => {
    app = await createTestApp();
    scanService = app.get(AttachmentScanService);
    storage = app.get(ObjectStorageService);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  async function seedPendingAttachment(tenantId: string, userId: string, mimeType: string, content: Buffer) {
    const attachmentId = randomUUID();
    const storageKey = storage.buildStorageKey(tenantId, attachmentId, "test-file");
    await storage.putObject(storageKey, content, mimeType);
    await adminPrisma.attachment.create({
      data: {
        id: attachmentId,
        tenantId,
        entityType: "test_entity",
        entityId: randomUUID(),
        fileName: "test-file",
        fileUrl: storageKey,
        fileSize: content.byteLength,
        mimeType,
        uploadedBy: userId,
        scanStatus: "PENDING_SCAN",
      },
    });
    return { attachmentId, storageKey };
  }

  it("file bersih, MIME BUKAN gambar -> scanStatus CLEAN, tidak ada thumbnail digenerate", async () => {
    const fixture = await seedTenantFixture();
    const user = await seedUserInTenant(fixture.tenantId);
    const { attachmentId, storageKey } = await seedPendingAttachment(
      fixture.tenantId,
      user.id,
      "application/pdf",
      Buffer.from("dokumen PDF biasa, tidak ada apa-apa"),
    );

    await scanService.processScanJob({ tenantId: fixture.tenantId, attachmentId, storageKey, mimeType: "application/pdf" });

    const updated = await adminPrisma.attachment.findUniqueOrThrow({ where: { id: attachmentId } });
    expect(updated.scanStatus).toBe("CLEAN");
    expect(updated.thumbnailUrl).toBeNull();
  });

  it("file bersih, MIME image -> scanStatus CLEAN DAN thumbnail sungguhan digenerate + ter-upload ke storage (dimensi dibatasi)", async () => {
    const fixture = await seedTenantFixture();
    const user = await seedUserInTenant(fixture.tenantId);
    // Gambar merah 800x600 sungguhan (sharp) — lebih besar dari batas
    // thumbnail (320px) supaya resize benar-benar teruji, bukan no-op.
    const imageBuffer = await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 255, g: 0, b: 0 } } })
      .jpeg()
      .toBuffer();
    const { attachmentId, storageKey } = await seedPendingAttachment(fixture.tenantId, user.id, "image/jpeg", imageBuffer);

    await scanService.processScanJob({ tenantId: fixture.tenantId, attachmentId, storageKey, mimeType: "image/jpeg" });

    const updated = await adminPrisma.attachment.findUniqueOrThrow({ where: { id: attachmentId } });
    expect(updated.scanStatus).toBe("CLEAN");
    expect(updated.thumbnailUrl).toBeTruthy();

    const thumbHead = await storage.headObject(updated.thumbnailUrl!);
    expect(thumbHead.exists).toBe(true);

    const thumbBuffer = await storage.getObjectBuffer(updated.thumbnailUrl!);
    const metadata = await sharp(thumbBuffer).metadata();
    expect(metadata.width).toBeLessThanOrEqual(320);
    expect(metadata.height).toBeLessThanOrEqual(320);
    expect(metadata.format).toBe("jpeg");
  });

  it("scanner lapor infected -> scanStatus INFECTED, TIDAK ada thumbnail digenerate walau MIME image (DI override, lihat komentar file)", async () => {
    const alwaysInfectedScanner: MalwareScanner = {
      scan: async () => ({ clean: false, signature: "Test-Injected-Signature" }),
    };
    const moduleRef = await testingModuleBuilder().overrideProvider(MALWARE_SCANNER).useValue(alwaysInfectedScanner).compile();
    const overriddenApp = await finishTestApp(moduleRef);

    try {
      const overriddenScanService = overriddenApp.get(AttachmentScanService);
      const overriddenStorage = overriddenApp.get(ObjectStorageService);

      const fixture = await seedTenantFixture();
      const user = await seedUserInTenant(fixture.tenantId);
      const attachmentId = randomUUID();
      const storageKey = overriddenStorage.buildStorageKey(fixture.tenantId, attachmentId, "gambar-normal.jpg");
      // Konten SUNGGUHAN gambar biasa (bukan EICAR) — infected-nya datang
      // MURNI dari scanner yang di-override, bukan dari isi file.
      const imageBuffer = await sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 0, g: 255, b: 0 } } })
        .jpeg()
        .toBuffer();
      await overriddenStorage.putObject(storageKey, imageBuffer, "image/jpeg");
      await adminPrisma.attachment.create({
        data: {
          id: attachmentId,
          tenantId: fixture.tenantId,
          entityType: "test_entity",
          entityId: randomUUID(),
          fileName: "gambar-normal.jpg",
          fileUrl: storageKey,
          fileSize: imageBuffer.byteLength,
          mimeType: "image/jpeg",
          uploadedBy: user.id,
          scanStatus: "PENDING_SCAN",
        },
      });

      await overriddenScanService.processScanJob({ tenantId: fixture.tenantId, attachmentId, storageKey, mimeType: "image/jpeg" });

      const updated = await adminPrisma.attachment.findUniqueOrThrow({ where: { id: attachmentId } });
      expect(updated.scanStatus).toBe("INFECTED");
      expect(updated.thumbnailUrl).toBeNull();
    } finally {
      await overriddenApp.close();
    }
  });
});
