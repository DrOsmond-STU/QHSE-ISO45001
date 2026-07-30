import { ForbiddenException, INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AttachmentService } from "../../src/platform/attachment/attachment.service";
import { ObjectStorageService } from "../../src/platform/attachment/object-storage.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, createTestApp, seedTenantFixture, seedUserInTenant } from "./test-helpers";

// TASK_INSTRUCTION.md §0.12 acceptance criterion (SATU-SATUNYA yang
// eksplisit disebut task ini): "File PENDING_SCAN/INFECTED tidak dapat
// diunduh publik sampai CLEAN." Ini suite test yang membuktikannya
// langsung, lintas ketiga status.
describe("AttachmentService — getDownloadUrl (acceptance criterion task 0.12)", () => {
  let app: INestApplication;
  let service: AttachmentService;
  let storage: ObjectStorageService;

  beforeAll(async () => {
    app = await createTestApp();
    service = app.get(AttachmentService);
    storage = app.get(ObjectStorageService);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  async function seedAttachmentWithStatus(
    tenantId: string,
    userId: string,
    scanStatus: "PENDING_SCAN" | "CLEAN" | "INFECTED",
    content: Buffer,
  ) {
    const attachmentId = randomUUID();
    const storageKey = storage.buildStorageKey(tenantId, attachmentId, "download-test-file");
    await storage.putObject(storageKey, content, "application/pdf");
    await adminPrisma.attachment.create({
      data: {
        id: attachmentId,
        tenantId,
        entityType: "test_entity",
        entityId: randomUUID(),
        fileName: "download-test-file",
        fileUrl: storageKey,
        fileSize: content.byteLength,
        mimeType: "application/pdf",
        uploadedBy: userId,
        scanStatus,
      },
    });
    return attachmentId;
  }

  it("scanStatus PENDING_SCAN -> ForbiddenException, TIDAK ada presigned URL diterbitkan", async () => {
    const fixture = await seedTenantFixture();
    const user = await seedUserInTenant(fixture.tenantId);
    const attachmentId = await seedAttachmentWithStatus(fixture.tenantId, user.id, "PENDING_SCAN", Buffer.from("isi file"));

    await expect(
      tenantContextStorage.run({ tenantId: fixture.tenantId }, () => service.getDownloadUrl(attachmentId)),
    ).rejects.toThrow(ForbiddenException);
  });

  it("scanStatus INFECTED -> ForbiddenException, TIDAK ada presigned URL diterbitkan", async () => {
    const fixture = await seedTenantFixture();
    const user = await seedUserInTenant(fixture.tenantId);
    const attachmentId = await seedAttachmentWithStatus(fixture.tenantId, user.id, "INFECTED", Buffer.from("isi file"));

    await expect(
      tenantContextStorage.run({ tenantId: fixture.tenantId }, () => service.getDownloadUrl(attachmentId)),
    ).rejects.toThrow(ForbiddenException);
  });

  it("scanStatus CLEAN -> presigned download URL berhasil dibuat DAN benar-benar bisa diunduh isinya", async () => {
    const fixture = await seedTenantFixture();
    const user = await seedUserInTenant(fixture.tenantId);
    const content = "isi file yang sudah dinyatakan bersih";
    const attachmentId = await seedAttachmentWithStatus(fixture.tenantId, user.id, "CLEAN", Buffer.from(content));

    const { downloadUrl } = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
      service.getDownloadUrl(attachmentId),
    );
    expect(downloadUrl).toBeTruthy();

    const response = await fetch(downloadUrl);
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe(content);
  });
});
