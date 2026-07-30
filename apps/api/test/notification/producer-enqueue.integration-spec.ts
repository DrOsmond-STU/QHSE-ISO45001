import { INestApplication, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { NotificationDeliveryJobPayload } from "../../src/platform/notification/notification-delivery-job.types";
import { NotificationQueueService } from "../../src/platform/notification/notification-queue.service";
import { NotificationService } from "../../src/platform/notification/notification.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import {
  adminPrisma,
  createTestApp,
  finishTestApp,
  seedNotificationChannel,
  seedNotificationPreference,
  seedNotificationTemplate,
  seedTenantFixture,
  seedUserInTenant,
  testingModuleBuilder,
  minutesToUtcTime,
} from "./test-helpers";

// Modul 25 §4.1 alur pengiriman generik — producer NotificationService.enqueue().
describe("NotificationService — enqueue()", () => {
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

  it("BR-02: hanya template IN_APP dikonfigurasi -> notifications + 1 notification_logs(IN_APP,SENT) dibuat sinkron, TIDAK ada job di-enqueue", async () => {
    const fixture = await seedTenantFixture();
    const user = await seedUserInTenant(fixture.tenantId);
    await seedNotificationTemplate(fixture.tenantId, { eventType: "ONLY_IN_APP", channelCode: "IN_APP" });

    const result = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
      service.enqueue({
        eventType: "ONLY_IN_APP",
        entityType: "test_entity",
        entityId: "11111111-1111-1111-1111-111111111111",
        recipientUserId: user.id,
        priority: "MEDIUM",
        eventCategory: "TEST_CATEGORY",
        variables: { name: "Budi" },
      }),
    );

    const notification = await adminPrisma.notification.findUniqueOrThrow({ where: { id: result.notificationId } });
    expect(notification.title).toBe("Judul Budi");
    expect(notification.body).toBe("Isi pesan untuk Budi.");

    const logs = await adminPrisma.notificationLog.findMany({ where: { notificationId: result.notificationId } });
    expect(logs).toHaveLength(1);
    expect(logs[0].channelCode).toBe("IN_APP");
    expect(logs[0].status).toBe("SENT");
  });

  /**
   * Verifikasi "job masuk notification-queue dengan payload benar" pakai DI
   * overrideProvider(NotificationQueueService) — spy yang MEREKAM
   * pemanggilan, BUKAN inspeksi ulang state BullMQ/Redis sungguhan
   * setelahnya. Sengaja BUKAN pola inspector-Queue (lihat
   * test/workflow-engine/workflow-sla-queue.integration-spec.ts task 0.9)
   * — pola itu RENTAN race kalau ADA worker sungguhan (mis. sesi lain yang
   * kebetulan jalan bersamaan di folder proyek ini) langsung mengonsumsi +
   * menghapus job (`removeOnComplete: true`) sebelum inspeksi kita sempat
   * jalan, menghasilkan false negative yang tidak mencerminkan bug
   * produksi (dibuktikan berulang lewat debugging manual — lihat entri
   * task 0.12 README/TDD §26). Spy DI menghindari race ini sepenuhnya.
   */
  it("EMAIL tenant-enabled + user opt-in -> notification_logs(EMAIL,QUEUED) dibuat DAN NotificationQueueService.enqueueDelivery() dipanggil dengan payload benar", async () => {
    const recordedCalls: NotificationDeliveryJobPayload[] = [];
    const spyQueueService: Pick<NotificationQueueService, "enqueueDelivery"> = {
      enqueueDelivery: async (payload) => {
        recordedCalls.push(payload);
      },
    };
    const moduleRef = await testingModuleBuilder().overrideProvider(NotificationQueueService).useValue(spyQueueService).compile();
    const overriddenApp = await finishTestApp(moduleRef);

    try {
      const overriddenService = overriddenApp.get(NotificationService);
      const fixture = await seedTenantFixture();
      const user = await seedUserInTenant(fixture.tenantId, "Email Recipient");
      await seedNotificationTemplate(fixture.tenantId, { eventType: "WITH_EMAIL", channelCode: "IN_APP" });
      await seedNotificationTemplate(fixture.tenantId, {
        eventType: "WITH_EMAIL",
        channelCode: "EMAIL",
        subjectTemplate: "Subjek {{name}}",
        bodyTemplate: "Body email untuk {{name}}.",
      });
      await seedNotificationChannel(fixture.tenantId, "EMAIL", true);
      await seedNotificationPreference(fixture.tenantId, user.id, { channelCode: "EMAIL", eventCategory: "TEST_CATEGORY", isEnabled: true });

      const result = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
        overriddenService.enqueue({
          eventType: "WITH_EMAIL",
          entityType: "test_entity",
          entityId: "22222222-2222-2222-2222-222222222222",
          recipientUserId: user.id,
          priority: "MEDIUM",
          eventCategory: "TEST_CATEGORY",
          variables: { name: "Siti" },
        }),
      );

      const emailLog = await adminPrisma.notificationLog.findFirstOrThrow({
        where: { notificationId: result.notificationId, channelCode: "EMAIL" },
      });
      expect(emailLog.status).toBe("QUEUED");
      expect(emailLog.attemptCount).toBe(0);

      expect(recordedCalls).toHaveLength(1);
      expect(recordedCalls[0].notificationLogId).toBe(emailLog.id);
      expect(recordedCalls[0].channelCode).toBe("EMAIL");
      expect(recordedCalls[0].recipientAddress).toBe(user.email);
      expect(recordedCalls[0].subject).toBe("Subjek Siti");
      expect(recordedCalls[0].body).toBe("Body email untuk Siti.");
    } finally {
      await overriddenApp.close();
    }
  });

  it("BR-03: notification_channels.is_enabled=false di level tenant -> EMAIL TIDAK dikirim walau user sudah opt-in", async () => {
    const fixture = await seedTenantFixture();
    const user = await seedUserInTenant(fixture.tenantId);
    await seedNotificationTemplate(fixture.tenantId, { eventType: "TENANT_DISABLED", channelCode: "IN_APP" });
    await seedNotificationChannel(fixture.tenantId, "EMAIL", false); // tenant matikan EMAIL
    await seedNotificationPreference(fixture.tenantId, user.id, { channelCode: "EMAIL", eventCategory: "TEST_CATEGORY", isEnabled: true });

    const result = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
      service.enqueue({
        eventType: "TENANT_DISABLED",
        entityType: "test_entity",
        entityId: "33333333-3333-3333-3333-333333333333",
        recipientUserId: user.id,
        priority: "MEDIUM",
        eventCategory: "TEST_CATEGORY",
        variables: { name: "Test" }, // cocok {{name}} di template default seedNotificationTemplate()
      }),
    );

    const logs = await adminPrisma.notificationLog.findMany({ where: { notificationId: result.notificationId } });
    expect(logs).toHaveLength(1);
    expect(logs[0].channelCode).toBe("IN_APP");
  });

  it("fallback template: tidak ada template khusus tenant -> pakai template default sistem (tenantId NULL)", async () => {
    const fixture = await seedTenantFixture();
    const user = await seedUserInTenant(fixture.tenantId);
    // eventType di-random per run: baris tenantId:null bersifat GLOBAL
    // (bukan diisolasi tenant fresh random seperti baris ber-tenant), jadi
    // literal tetap akan bentrok partial unique index di run test berikutnya
    // (DB test ini tidak di-flush antar run — lihat test-helpers.ts).
    const eventType = `SYSTEM_DEFAULT_ONLY_${randomUUID()}`;
    await seedNotificationTemplate(null, {
      eventType,
      channelCode: "IN_APP",
      subjectTemplate: "Default sistem: {{name}}",
    });

    const result = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
      service.enqueue({
        eventType,
        entityType: "test_entity",
        entityId: "44444444-4444-4444-4444-444444444444",
        recipientUserId: user.id,
        priority: "LOW",
        eventCategory: "TEST_CATEGORY",
        variables: { name: "Andi" },
      }),
    );

    const notification = await adminPrisma.notification.findUniqueOrThrow({ where: { id: result.notificationId } });
    expect(notification.title).toBe("Default sistem: Andi");
  });

  it("template tenant-specific MENANG atas default sistem kalau keduanya ada", async () => {
    const fixture = await seedTenantFixture();
    const user = await seedUserInTenant(fixture.tenantId);
    const eventType = `OVERRIDE_TEST_${randomUUID()}`; // lihat catatan random di test "fallback template" di atas
    await seedNotificationTemplate(null, { eventType, channelCode: "IN_APP", subjectTemplate: "Default: {{name}}" });
    await seedNotificationTemplate(fixture.tenantId, { eventType, channelCode: "IN_APP", subjectTemplate: "Override tenant: {{name}}" });

    const result = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
      service.enqueue({
        eventType,
        entityType: "test_entity",
        entityId: "55555555-5555-5555-5555-555555555555",
        recipientUserId: user.id,
        priority: "LOW",
        eventCategory: "TEST_CATEGORY",
        variables: { name: "Rina" },
      }),
    );

    const notification = await adminPrisma.notification.findUniqueOrThrow({ where: { id: result.notificationId } });
    expect(notification.title).toBe("Override tenant: Rina");
  });

  it("tidak ada template sama sekali untuk event_type -> NotFoundException eksplisit", async () => {
    const fixture = await seedTenantFixture();
    const user = await seedUserInTenant(fixture.tenantId);

    await expect(
      tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
        service.enqueue({
          eventType: "TIDAK_PERNAH_DIKONFIGURASI",
          entityType: "test_entity",
          entityId: "66666666-6666-6666-6666-666666666666",
          recipientUserId: user.id,
          priority: "LOW",
          eventCategory: "TEST_CATEGORY",
          variables: {},
        }),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  async function seedEmailAroundNowQuietHours(tenantId: string, userId: string, eventType: string) {
    await seedNotificationTemplate(tenantId, { eventType, channelCode: "IN_APP" });
    await seedNotificationTemplate(tenantId, { eventType, channelCode: "EMAIL", bodyTemplate: "Body {{name}}." });
    await seedNotificationChannel(tenantId, "EMAIL", true);

    // Jendela sempit yang PASTI mencakup "now" saat enqueue() dipanggil
    // (bukan 00:00-23:59 seluruh hari, biar test sungguhan menguji
    // konversi @db.Time -> menit, bukan cuma "selalu true").
    const nowMinutes = new Date().getUTCHours() * 60 + new Date().getUTCMinutes();
    await seedNotificationPreference(tenantId, userId, {
      channelCode: "EMAIL",
      eventCategory: "TEST_CATEGORY",
      isEnabled: true,
      quietHoursStart: minutesToUtcTime(nowMinutes - 2),
      quietHoursEnd: minutesToUtcTime(nowMinutes + 3),
    });
  }

  it("quiet hours (priority non-CRITICAL): EMAIL user ada di jendela quiet hours SEKARANG -> TIDAK di-queue, hanya IN_APP", async () => {
    const fixture = await seedTenantFixture();
    const user = await seedUserInTenant(fixture.tenantId);
    await seedEmailAroundNowQuietHours(fixture.tenantId, user.id, "QUIET_HOURS_SUPPRESS");

    const result = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
      service.enqueue({
        eventType: "QUIET_HOURS_SUPPRESS",
        entityType: "test_entity",
        entityId: "99999999-9999-9999-9999-999999999991",
        recipientUserId: user.id,
        priority: "HIGH",
        eventCategory: "TEST_CATEGORY",
        variables: { name: "Dedi" },
      }),
    );

    const logs = await adminPrisma.notificationLog.findMany({ where: { notificationId: result.notificationId } });
    expect(logs.map((l) => l.channelCode)).toEqual(["IN_APP"]);
  });

  it("BR-01: priority CRITICAL mengabaikan quiet hours -> EMAIL tetap di-queue walau sedang jendela quiet hours user", async () => {
    const fixture = await seedTenantFixture();
    const user = await seedUserInTenant(fixture.tenantId);
    await seedEmailAroundNowQuietHours(fixture.tenantId, user.id, "QUIET_HOURS_CRITICAL_BYPASS");

    const result = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
      service.enqueue({
        eventType: "QUIET_HOURS_CRITICAL_BYPASS",
        entityType: "test_entity",
        entityId: "99999999-9999-9999-9999-999999999992",
        recipientUserId: user.id,
        priority: "CRITICAL",
        eventCategory: "TEST_CATEGORY",
        variables: { name: "Dedi" },
      }),
    );

    const logs = await adminPrisma.notificationLog.findMany({ where: { notificationId: result.notificationId } });
    expect(logs.map((l) => l.channelCode).sort()).toEqual(["EMAIL", "IN_APP"]);
  });
});
