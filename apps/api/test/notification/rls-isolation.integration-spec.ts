import { INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { NotificationService } from "../../src/platform/notification/notification.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, createTestApp, seedNotificationTemplate, seedTenantFixture, seedUserInTenant } from "./test-helpers";

// Generic RLS suite (test/rls/generic-tenant-isolation.integration-spec.ts,
// task 0.3) sudah otomatis membuktikan RLS AKTIF + "0 baris tanpa context"
// untuk 4/5 tabel notification (tenant_id NOT NULL). Test di sini
// melengkapi DUA hal yang generic suite TIDAK bisa buktikan otomatis:
// (1) kebijakan asimetris notification_templates (tenant_id nullable,
// baris sistem HARUS terlihat lintas tenant — pola sama roles/
// role_permissions task 0.8), (2) tenant A benar-benar tidak bisa "pinjam"
// data tenant B lewat enqueue() sungguhan (bukan cuma raw query manual).
describe("Notification Service — isolasi tenant (RLS)", () => {
  let app: INestApplication;
  let service: NotificationService;

  beforeAll(async () => {
    app = await createTestApp();
    service = app.get(NotificationService);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  it("notification_templates sistem (tenant_id NULL) terlihat lintas tenant, template tenant lain TIDAK", async () => {
    const fixtureA = await seedTenantFixture();
    const fixtureB = await seedTenantFixture();
    const userA = await seedUserInTenant(fixtureA.tenantId);
    // eventType di-random: baris tenantId:null bersifat GLOBAL, literal
    // tetap akan bentrok partial unique index di run test berikutnya
    // (lihat catatan lengkap di test-helpers.ts::seedNotificationTemplate).
    const eventType = `SHARED_EVENT_${randomUUID()}`;

    await seedNotificationTemplate(null, { eventType, channelCode: "IN_APP", subjectTemplate: "Sistem: {{name}}" });
    // Template khusus tenant B TIDAK boleh terpakai saat enqueue dari tenant A.
    await seedNotificationTemplate(fixtureB.tenantId, { eventType, channelCode: "IN_APP", subjectTemplate: "Punya B: {{name}}" });

    const result = await tenantContextStorage.run({ tenantId: fixtureA.tenantId }, () =>
      service.enqueue({
        eventType,
        entityType: "test_entity",
        entityId: "10101010-1010-1010-1010-101010101010",
        recipientUserId: userA.id,
        priority: "LOW",
        eventCategory: "TEST_CATEGORY",
        variables: { name: "TenantA" },
      }),
    );

    const notification = await adminPrisma.notification.findUniqueOrThrow({ where: { id: result.notificationId } });
    // Fallback ke template SISTEM, bukan template tenant B yang notabene
    // tidak pernah boleh terlihat oleh tenant A (RLS asimetris tetap
    // membatasi baris tenant_id NOT NULL milik tenant lain).
    expect(notification.title).toBe("Sistem: TenantA");
  });

  it("recipientUserId milik tenant lain -> findUniqueOrThrow gagal (RLS: user tenant lain tidak terlihat)", async () => {
    const fixtureA = await seedTenantFixture();
    const fixtureB = await seedTenantFixture();
    const userB = await seedUserInTenant(fixtureB.tenantId);
    await seedNotificationTemplate(fixtureA.tenantId, { eventType: "CROSS_TENANT_USER", channelCode: "IN_APP" });

    await expect(
      tenantContextStorage.run({ tenantId: fixtureA.tenantId }, () =>
        service.enqueue({
          eventType: "CROSS_TENANT_USER",
          entityType: "test_entity",
          entityId: "20202020-2020-2020-2020-202020202020",
          recipientUserId: userB.id, // user tenant B, tapi context tenant A
          priority: "LOW",
          eventCategory: "TEST_CATEGORY",
          variables: {},
        }),
      ),
    ).rejects.toThrow();
  });
});
