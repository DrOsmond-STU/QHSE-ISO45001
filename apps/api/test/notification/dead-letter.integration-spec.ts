import { INestApplication } from "@nestjs/common";
import { NotificationDeliveryService } from "../../src/platform/notification/notification-delivery.service";
import { NOTIFICATION_MAX_ATTEMPTS } from "../../src/platform/notification/notification.constants";
import { adminPrisma, createTestApp, seedTenantFixture, seedUserInTenant } from "./test-helpers";

// TASK_INSTRUCTION.md §0.11 acceptance criterion: "Kegagalan permanen
// masuk dead-letter + entry FAILED (tidak hilang diam-diam)". Panggil
// NotificationDeliveryService.processDeliveryJob() LANGSUNG (bukan lewat
// BullMQ Worker sungguhan menunggu backoff nyata) — konsisten dengan
// konvensi "no real external dependency di automated test" (lihat
// test/workflow-engine/workflow-sla-scan.integration-spec.ts task 0.9)
// DAN menghindari test lambat/flaky menunggu exponential backoff
// sungguhan (bisa puluhan detik untuk 5 percobaan). Push ke dead-letter
// QUEUE (worker.on('failed') di apps/worker/src/notification.worker.ts)
// diverifikasi manual, bukan otomatis di sini — apps/worker tidak punya
// test suite sendiri (pola sama task 0.9, lihat README entri task 0.11).
//
// Provider EMAIL/WHATSAPP/TELEGRAM stub (task 0.11) SELALU throw "belum
// dikonfigurasi" (Modul 30 belum ada) — kegagalan ini yang dipakai
// membuktikan jalur dead-letter TANPA pernah mengirim pesan sungguhan
// (acceptance criterion kedua).
describe("NotificationDeliveryService — kegagalan permanen -> dead-letter", () => {
  let app: INestApplication;
  let deliveryService: NotificationDeliveryService;

  beforeAll(async () => {
    app = await createTestApp();
    deliveryService = app.get(NotificationDeliveryService);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  async function seedQueuedEmailLog(tenantId: string, recipientUserId: string) {
    const notification = await adminPrisma.notification.create({
      data: {
        tenantId,
        recipientUserId,
        eventType: "TEST_EVENT",
        entityType: "test_entity",
        entityId: "77777777-7777-7777-7777-777777777777",
        title: "Judul",
        body: "Isi",
        priority: "MEDIUM",
      },
    });
    const log = await adminPrisma.notificationLog.create({
      data: { tenantId, notificationId: notification.id, channelCode: "EMAIL", status: "QUEUED" },
    });
    return log;
  }

  it("percobaan BUKAN terakhir gagal -> status tetap QUEUED (BullMQ masih akan retry), attempt_count naik, tetap rethrow", async () => {
    const fixture = await seedTenantFixture();
    const user = await seedUserInTenant(fixture.tenantId);
    const log = await seedQueuedEmailLog(fixture.tenantId, user.id);

    await expect(
      deliveryService.processDeliveryJob(
        { tenantId: fixture.tenantId, notificationLogId: log.id, channelCode: "EMAIL", recipientAddress: user.email, subject: "s", body: "b" },
        { attemptsMade: 0, maxAttempts: NOTIFICATION_MAX_ATTEMPTS },
      ),
    ).rejects.toThrow(/belum dikonfigurasi/);

    const updated = await adminPrisma.notificationLog.findUniqueOrThrow({ where: { id: log.id } });
    expect(updated.status).toBe("QUEUED");
    expect(updated.attemptCount).toBe(1);
  });

  it("attempt_count di DB adalah AKUMULASI percobaan nyata (bukan bisa 'dilompati' lewat context.attemptsMade sendirian) -> baru FAILED setelah percobaan ke-N yang SUNGGUHAN", async () => {
    const fixture = await seedTenantFixture();
    const user = await seedUserInTenant(fixture.tenantId);
    const log = await seedQueuedEmailLog(fixture.tenantId, user.id);
    const payload = { tenantId: fixture.tenantId, notificationLogId: log.id, channelCode: "EMAIL" as const, recipientAddress: user.email, subject: "s", body: "b" };

    // Simulasikan BullMQ benar-benar retry NOTIFICATION_MAX_ATTEMPTS kali
    // berurutan (attemptsMade naik 0,1,2,... tiap panggilan, persis yang
    // worker lakukan lewat job.attemptsMade sungguhan) — attempt_count DB
    // harus mengikuti akumulasi ini, bukan cuma "increment 1" dari state
    // kosong tak peduli attemptsMade berapa yang diklaim.
    for (let attemptsMade = 0; attemptsMade < NOTIFICATION_MAX_ATTEMPTS - 1; attemptsMade++) {
      await expect(
        deliveryService.processDeliveryJob(payload, { attemptsMade, maxAttempts: NOTIFICATION_MAX_ATTEMPTS }),
      ).rejects.toThrow(/belum dikonfigurasi/);

      const intermediate = await adminPrisma.notificationLog.findUniqueOrThrow({ where: { id: log.id } });
      expect(intermediate.status).toBe("QUEUED"); // belum percobaan terakhir
      expect(intermediate.attemptCount).toBe(attemptsMade + 1);
    }

    // Percobaan TERAKHIR (attemptsMade = maxAttempts - 1).
    await expect(
      deliveryService.processDeliveryJob(payload, { attemptsMade: NOTIFICATION_MAX_ATTEMPTS - 1, maxAttempts: NOTIFICATION_MAX_ATTEMPTS }),
    ).rejects.toThrow(/belum dikonfigurasi/);

    const final = await adminPrisma.notificationLog.findUniqueOrThrow({ where: { id: log.id } });
    expect(final.status).toBe("FAILED");
    expect(final.attemptCount).toBe(NOTIFICATION_MAX_ATTEMPTS);
    expect(final.providerResponse).toEqual(expect.objectContaining({ error: expect.stringContaining("belum dikonfigurasi") }));
  });

  it("WHATSAPP dan TELEGRAM sama-sama throw eksplisit (stub, Modul 30 belum ada) — bukan cuma EMAIL", async () => {
    const fixture = await seedTenantFixture();
    const user = await seedUserInTenant(fixture.tenantId);

    const waLog = await seedQueuedEmailLog(fixture.tenantId, user.id);
    await adminPrisma.notificationLog.update({ where: { id: waLog.id }, data: { channelCode: "WHATSAPP" } });
    await expect(
      deliveryService.processDeliveryJob(
        { tenantId: fixture.tenantId, notificationLogId: waLog.id, channelCode: "WHATSAPP", recipientAddress: "+6281234567890", body: "b" },
        { attemptsMade: 0, maxAttempts: NOTIFICATION_MAX_ATTEMPTS },
      ),
    ).rejects.toThrow(/belum dikonfigurasi/);

    const tgLog = await seedQueuedEmailLog(fixture.tenantId, user.id);
    await adminPrisma.notificationLog.update({ where: { id: tgLog.id }, data: { channelCode: "TELEGRAM" } });
    await expect(
      deliveryService.processDeliveryJob(
        { tenantId: fixture.tenantId, notificationLogId: tgLog.id, channelCode: "TELEGRAM", recipientAddress: "123456789", body: "b" },
        { attemptsMade: 0, maxAttempts: NOTIFICATION_MAX_ATTEMPTS },
      ),
    ).rejects.toThrow(/belum dikonfigurasi/);
  });
});
