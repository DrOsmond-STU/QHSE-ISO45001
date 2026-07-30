import { BadRequestException, INestApplication, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { NotificationPreferenceService } from "../../src/modules/domains/notification/notification-preference.service";
import { NotificationQueryService } from "../../src/modules/domains/notification/notification-query.service";
import { NotificationService } from "../../src/platform/notification/notification.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { ROLE_CODES, seedRbacBaseline } from "../../prisma/seed-rbac-baseline";
import { generatePkcePair } from "../auth/test-helpers";
import {
  adminPrisma,
  createTestApp,
  seedNotificationChannel,
  seedNotificationPreference,
  seedNotificationTemplate,
  seedTenantFixture,
  seedUserInTenant,
} from "./test-helpers";

/**
 * seedTenantFixture() (test/auth/test-helpers.ts) sengaja membuat user
 * TANPA role sama sekali (fixture auth-flow murni, bukan RBAC) — utk
 * membuktikan "user BIASA (bukan sysadmin) dapat akses notification.*"
 * WAJIB tetapkan role baseline dulu (mana pun, notification.read/
 * notification.preference.manage ada di AUTHENTICATED_USER_PERMISSIONS,
 * digabung ke SEMUA 13 role tanpa kecuali — WORKER_EMPLOYEE dipilih krn
 * paling "biasa", tanpa privilese admin apa pun).
 */
async function assignWorkerRole(tenantId: string, userId: string): Promise<void> {
  await seedRbacBaseline(adminPrisma);
  const role = await adminPrisma.role.findFirstOrThrow({ where: { tenantId: null, roleCode: ROLE_CODES.WORKER_EMPLOYEE } });
  await adminPrisma.userRole.create({ data: { tenantId, userId, roleId: role.id, scopeType: "TENANT", scopeId: null } });
}

// Acceptance TASK_INSTRUCTION.md 1.7 — "preferensi user dihormati sebelum
// kirim (bukan hanya default sistem)". BR-01/02/03/04 Modul 25 SUDAH
// dibuktikan 0.11 (notification-channel-resolution.spec.ts) — task ini
// membuktikan sisi BARU: mengubah preferensi lewat
// NotificationPreferenceService (bukan `adminPrisma` langsung) BENAR-BENAR
// mengubah hasil `NotificationService.enqueue()` (0.11, tidak disentuh).
describe("NotificationQueryService/NotificationPreferenceService — Modul 25 (task 1.7)", () => {
  let app: INestApplication;
  let queryService: NotificationQueryService;
  let preferenceService: NotificationPreferenceService;
  let notificationService: NotificationService;

  beforeAll(async () => {
    app = await createTestApp();
    queryService = app.get(NotificationQueryService);
    preferenceService = app.get(NotificationPreferenceService);
    notificationService = app.get(NotificationService);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  describe("listForCurrentUser / unreadCount / markAsRead / markAllAsRead", () => {
    it("list mengembalikan notifikasi milik user, terbaru dulu, dgn meta pagination", async () => {
      const fixture = await seedTenantFixture();
      const older = await adminPrisma.notification.create({
        data: { tenantId: fixture.tenantId, recipientUserId: fixture.userId, eventType: "T", entityType: "T", entityId: randomUUID(), title: "Lama", body: "b", priority: "LOW" },
      });
      await new Promise((r) => setTimeout(r, 5));
      const newer = await adminPrisma.notification.create({
        data: { tenantId: fixture.tenantId, recipientUserId: fixture.userId, eventType: "T", entityType: "T", entityId: randomUUID(), title: "Baru", body: "b", priority: "LOW" },
      });

      const result = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        queryService.listForCurrentUser({ page: 1, limit: 10 }),
      );

      expect(result.meta).toEqual({ page: 1, limit: 10, total: 2 });
      expect(result.data.map((n) => n.id)).toEqual([newer.id, older.id]);
    });

    it("unreadOnly=true memfilter hanya yang belum dibaca", async () => {
      const fixture = await seedTenantFixture();
      await adminPrisma.notification.create({
        data: { tenantId: fixture.tenantId, recipientUserId: fixture.userId, eventType: "T", entityType: "T", entityId: randomUUID(), title: "Sudah dibaca", body: "b", priority: "LOW", isRead: true, readAt: new Date() },
      });
      const unread = await adminPrisma.notification.create({
        data: { tenantId: fixture.tenantId, recipientUserId: fixture.userId, eventType: "T", entityType: "T", entityId: randomUUID(), title: "Belum dibaca", body: "b", priority: "LOW" },
      });

      const result = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        queryService.listForCurrentUser({ unreadOnly: true }),
      );

      expect(result.data.map((n) => n.id)).toEqual([unread.id]);
    });

    it("unreadCount menghitung benar", async () => {
      const fixture = await seedTenantFixture();
      await adminPrisma.notification.createMany({
        data: [
          { tenantId: fixture.tenantId, recipientUserId: fixture.userId, eventType: "T", entityType: "T", entityId: randomUUID(), title: "A", body: "b", priority: "LOW" },
          { tenantId: fixture.tenantId, recipientUserId: fixture.userId, eventType: "T", entityType: "T", entityId: randomUUID(), title: "B", body: "b", priority: "LOW" },
          { tenantId: fixture.tenantId, recipientUserId: fixture.userId, eventType: "T", entityType: "T", entityId: randomUUID(), title: "C", body: "b", priority: "LOW", isRead: true, readAt: new Date() },
        ],
      });

      const count = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => queryService.unreadCount());
      expect(count).toBe(2);
    });

    it("markAsRead menandai baca + idempotent dipanggil dua kali", async () => {
      const fixture = await seedTenantFixture();
      const notification = await adminPrisma.notification.create({
        data: { tenantId: fixture.tenantId, recipientUserId: fixture.userId, eventType: "T", entityType: "T", entityId: randomUUID(), title: "A", body: "b", priority: "LOW" },
      });

      const marked = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        queryService.markAsRead(notification.id),
      );
      expect(marked.isRead).toBe(true);
      expect(marked.readAt).not.toBeNull();

      const markedAgain = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        queryService.markAsRead(notification.id),
      );
      expect(markedAgain.readAt?.getTime()).toBe(marked.readAt?.getTime()); // tidak ditimpa ulang
    });

    it("markAsRead menolak notifikasi milik user LAIN (walau tenant sama) dgn NotFoundException", async () => {
      const fixture = await seedTenantFixture();
      const otherUser = await seedUserInTenant(fixture.tenantId, "Other User");
      const otherNotification = await adminPrisma.notification.create({
        data: { tenantId: fixture.tenantId, recipientUserId: otherUser.id, eventType: "T", entityType: "T", entityId: randomUUID(), title: "Milik orang lain", body: "b", priority: "LOW" },
      });

      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => queryService.markAsRead(otherNotification.id)),
      ).rejects.toThrow(NotFoundException);
    });

    it("markAllAsRead menandai SEMUA notifikasi unread milik user, mengembalikan count", async () => {
      const fixture = await seedTenantFixture();
      await adminPrisma.notification.createMany({
        data: [
          { tenantId: fixture.tenantId, recipientUserId: fixture.userId, eventType: "T", entityType: "T", entityId: randomUUID(), title: "A", body: "b", priority: "LOW" },
          { tenantId: fixture.tenantId, recipientUserId: fixture.userId, eventType: "T", entityType: "T", entityId: randomUUID(), title: "B", body: "b", priority: "LOW" },
        ],
      });

      const result = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => queryService.markAllAsRead());
      expect(result.count).toBe(2);

      const remaining = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => queryService.unreadCount());
      expect(remaining).toBe(0);
    });
  });

  describe("getMatrixForCurrentUser / upsertPreference", () => {
    it("matrix default: IN_APP selalu true+tidak editable, channel eksternal false+editable (opt-in bukan opt-out)", async () => {
      const fixture = await seedTenantFixture();
      const matrix = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        preferenceService.getMatrixForCurrentUser(),
      );

      const inAppCells = matrix.filter((c) => c.channelCode === "IN_APP");
      expect(inAppCells.every((c) => c.isEnabled === true && c.editable === false)).toBe(true);
      const emailCells = matrix.filter((c) => c.channelCode === "EMAIL");
      expect(emailCells.every((c) => c.isEnabled === false && c.editable === true)).toBe(true);
    });

    it("BR-02: upsertPreference menolak channelCode=IN_APP", async () => {
      const fixture = await seedTenantFixture();
      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
          preferenceService.upsertPreference({ eventCategory: "INCIDENT", channelCode: "IN_APP", isEnabled: false }),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("menolak event_category yang tidak dikenal", async () => {
      const fixture = await seedTenantFixture();
      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
          preferenceService.upsertPreference({ eventCategory: "BUKAN_KATEGORI_VALID", channelCode: "EMAIL", isEnabled: true }),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("upsertPreference menyimpan + tercermin di matrix berikutnya", async () => {
      const fixture = await seedTenantFixture();
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        preferenceService.upsertPreference({ eventCategory: "TRAINING", channelCode: "WHATSAPP", isEnabled: true, quietHoursStart: "22:00", quietHoursEnd: "07:00" }),
      );

      const matrix = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        preferenceService.getMatrixForCurrentUser(),
      );
      const cell = matrix.find((c) => c.eventCategory === "TRAINING" && c.channelCode === "WHATSAPP")!;
      expect(cell.isEnabled).toBe(true);
      expect(cell.quietHoursStart).toBe("22:00");
      expect(cell.quietHoursEnd).toBe("07:00");
    });

    it("upsertPreference kedua utk cell yang SAMA meng-UPDATE, bukan duplikat baris", async () => {
      const fixture = await seedTenantFixture();
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        preferenceService.upsertPreference({ eventCategory: "AUDIT", channelCode: "EMAIL", isEnabled: true }),
      );
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        preferenceService.upsertPreference({ eventCategory: "AUDIT", channelCode: "EMAIL", isEnabled: false }),
      );

      const rows = await adminPrisma.notificationPreference.findMany({
        where: { userId: fixture.userId, eventCategory: "AUDIT", channelCode: "EMAIL" },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].isEnabled).toBe(false);
    });
  });

  describe("Acceptance literal 1.7 — preferensi yang diubah lewat NotificationPreferenceService BENAR-BENAR memengaruhi NotificationService.enqueue() (0.11, tidak dimodifikasi)", () => {
    it("tanpa preferensi -> hanya IN_APP terkirim; SETELAH opt-in via upsertPreference -> EMAIL ikut ter-queue", async () => {
      const fixture = await seedTenantFixture();
      const eventType = `ACCEPTANCE_1_7_${randomUUID()}`;
      const eventCategory = "INCIDENT";

      await seedNotificationChannel(fixture.tenantId, "EMAIL", true);
      await seedNotificationTemplate(null, { eventType, channelCode: "IN_APP" });
      await seedNotificationTemplate(null, { eventType, channelCode: "EMAIL" });

      // Case A: belum ada preferensi sama sekali -> EMAIL TIDAK terkirim.
      const resultA = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        notificationService.enqueue({
          eventType,
          entityType: "TEST",
          entityId: randomUUID(),
          recipientUserId: fixture.userId,
          priority: "MEDIUM",
          eventCategory,
          variables: { name: "Budi" },
        }),
      );
      const logsA = await adminPrisma.notificationLog.findMany({ where: { notificationId: resultA.notificationId } });
      expect(logsA.map((l) => l.channelCode).sort()).toEqual(["IN_APP"]);

      // Aktifkan EMAIL utk kategori INCIDENT lewat endpoint/service BARU task 1.7.
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        preferenceService.upsertPreference({ eventCategory, channelCode: "EMAIL", isEnabled: true }),
      );

      // Case B: event BARU (sama kategori) SETELAH opt-in -> EMAIL ikut ter-queue.
      const resultB = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        notificationService.enqueue({
          eventType,
          entityType: "TEST",
          entityId: randomUUID(),
          recipientUserId: fixture.userId,
          priority: "MEDIUM",
          eventCategory,
          variables: { name: "Budi" },
        }),
      );
      const logsB = await adminPrisma.notificationLog.findMany({ where: { notificationId: resultB.notificationId } });
      expect(logsB.map((l) => l.channelCode).sort()).toEqual(["EMAIL", "IN_APP"]);
      expect(logsB.find((l) => l.channelCode === "EMAIL")?.status).toBe("QUEUED");
    });

    it("upsertPreference(isEnabled=false) SETELAH sebelumnya true -> channel berhenti terkirim (matikan JUGA dihormati, bukan cuma nyalakan)", async () => {
      const fixture = await seedTenantFixture();
      const eventType = `ACCEPTANCE_1_7_OFF_${randomUUID()}`;
      const eventCategory = "CAPA";

      await seedNotificationChannel(fixture.tenantId, "EMAIL", true);
      await seedNotificationTemplate(null, { eventType, channelCode: "IN_APP" });
      await seedNotificationTemplate(null, { eventType, channelCode: "EMAIL" });
      await seedNotificationPreference(fixture.tenantId, fixture.userId, { eventCategory, channelCode: "EMAIL", isEnabled: true });

      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        preferenceService.upsertPreference({ eventCategory, channelCode: "EMAIL", isEnabled: false }),
      );

      const result = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        notificationService.enqueue({
          eventType,
          entityType: "TEST",
          entityId: randomUUID(),
          recipientUserId: fixture.userId,
          priority: "MEDIUM",
          eventCategory,
          variables: { name: "Budi" },
        }),
      );
      const logs = await adminPrisma.notificationLog.findMany({ where: { notificationId: result.notificationId } });
      expect(logs.map((l) => l.channelCode)).toEqual(["IN_APP"]);
    });
  });

  describe("HTTP end-to-end — permission + entitlement gate utk user biasa", () => {
    it("GET /notifications dan GET /notifications/preferences lolos utk user terautentikasi biasa (bukan sysadmin)", async () => {
      const fixture = await seedTenantFixture();
      await assignWorkerRole(fixture.tenantId, fixture.userId);
      const { verifier, challenge } = generatePkcePair();
      const loginRes = await request(app.getHttpServer())
        .post("/auth/login")
        .set("x-tenant-id", fixture.tenantId)
        .send({ email: fixture.email, password: fixture.password, codeChallenge: challenge, codeChallengeMethod: "S256" })
        .expect(201);
      const tokenRes = await request(app.getHttpServer())
        .post("/auth/token")
        .send({ grantType: "authorization_code", code: loginRes.body.data.code, codeVerifier: verifier })
        .expect(201);
      const accessToken = tokenRes.body.data.accessToken;

      await request(app.getHttpServer()).get("/notifications").set("Authorization", `Bearer ${accessToken}`).expect(200);
      await request(app.getHttpServer()).get("/notifications/unread-count").set("Authorization", `Bearer ${accessToken}`).expect(200);
      const prefsRes = await request(app.getHttpServer())
        .get("/notifications/preferences")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);
      expect(prefsRes.body.data.categories.length).toBeGreaterThan(0);
      expect(prefsRes.body.data.matrix.length).toBeGreaterThan(0);

      const putRes = await request(app.getHttpServer())
        .put("/notifications/preferences")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ eventCategory: "MEETING", channelCode: "TELEGRAM", isEnabled: true })
        .expect(200);
      expect(putRes.body.data.isEnabled).toBe(true);
    });

    it("GET /notifications tanpa Bearer token -> 401 (JwtAuthGuard fail-closed)", async () => {
      await request(app.getHttpServer()).get("/notifications").expect(401);
    });
  });
});
