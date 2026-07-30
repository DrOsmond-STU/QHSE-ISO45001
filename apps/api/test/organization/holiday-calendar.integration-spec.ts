import { INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { HolidayCalendarService } from "../../src/modules/domains/organization/industry-template/holiday-calendar.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, createTestApp, seedOrganizationTree, seedTenantFixture } from "./test-helpers";

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

describe("HolidayCalendarService (Modul 01 §5/§6 BR-05)", () => {
  let app: INestApplication;
  let service: HolidayCalendarService;

  beforeAll(async () => {
    app = await createTestApp();
    service = app.get(HolidayCalendarService);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  function asUser<T>(tenantId: string, userId: string, fn: () => Promise<T>): Promise<T> {
    return tenantContextStorage.run({ tenantId, userId }, fn);
  }

  it("createCalendar() dasar berhasil dan ter-scope tenant (RLS)", async () => {
    const fixture = await seedTenantFixture();
    const calendar = await asUser(fixture.tenantId, fixture.userId, () =>
      service.createCalendar({ name: "Kalender Nasional" }),
    );
    expect(calendar.tenantId).toBe(fixture.tenantId);
    expect(calendar.isDefault).toBe(false);
  });

  it("BR-05: mengatur isDefault:true pada kalender baru otomatis meng-unset kalender default sebelumnya (satu tenant, maksimal satu default)", async () => {
    const fixture = await seedTenantFixture();

    const first = await asUser(fixture.tenantId, fixture.userId, () =>
      service.createCalendar({ name: "Kalender A", isDefault: true }),
    );
    expect(first.isDefault).toBe(true);

    const second = await asUser(fixture.tenantId, fixture.userId, () =>
      service.createCalendar({ name: "Kalender B", isDefault: true }),
    );
    expect(second.isDefault).toBe(true);

    const defaults = await adminPrisma.holidayCalendar.findMany({
      where: { tenantId: fixture.tenantId, isDefault: true },
    });
    expect(defaults).toHaveLength(1);
    expect(defaults[0].id).toBe(second.id);
  });

  it("BR-05: setAsDefault() memindahkan status default antar kalender yang sudah ada", async () => {
    const fixture = await seedTenantFixture();
    const a = await asUser(fixture.tenantId, fixture.userId, () => service.createCalendar({ name: "A", isDefault: true }));
    const b = await asUser(fixture.tenantId, fixture.userId, () => service.createCalendar({ name: "B" }));

    await asUser(fixture.tenantId, fixture.userId, () => service.setAsDefault(b.id));

    const [refreshedA, refreshedB] = await Promise.all([
      adminPrisma.holidayCalendar.findUniqueOrThrow({ where: { id: a.id } }),
      adminPrisma.holidayCalendar.findUniqueOrThrow({ where: { id: b.id } }),
    ]);
    expect(refreshedA.isDefault).toBe(false);
    expect(refreshedB.isDefault).toBe(true);
  });

  it("BR-05 tidak lintas tenant: default tenant A tidak ke-unset oleh create default tenant B", async () => {
    const fixtureA = await seedTenantFixture();
    const fixtureB = await seedTenantFixture();

    const calA = await asUser(fixtureA.tenantId, fixtureA.userId, () => service.createCalendar({ name: "A", isDefault: true }));
    await asUser(fixtureB.tenantId, fixtureB.userId, () => service.createCalendar({ name: "B", isDefault: true }));

    const refreshedA = await adminPrisma.holidayCalendar.findUniqueOrThrow({ where: { id: calA.id } });
    expect(refreshedA.isDefault).toBe(true);
  });

  it("addEntry()/listEntries() dan removeEntry() HARD DELETE sungguhan (bukan soft delete — holiday_calendar_entries tidak punya deletedAt)", async () => {
    const fixture = await seedTenantFixture();
    const calendar = await asUser(fixture.tenantId, fixture.userId, () => service.createCalendar({ name: "Kalender Entries" }));

    const entry = await asUser(fixture.tenantId, fixture.userId, () =>
      service.addEntry({ holidayCalendarId: calendar.id, holidayDate: utc(2026, 8, 17), name: "Kemerdekaan", isRecurringYearly: true }),
    );

    let entries = await asUser(fixture.tenantId, fixture.userId, () => service.listEntries(calendar.id));
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe(entry.id);

    await asUser(fixture.tenantId, fixture.userId, () => service.removeEntry(entry.id));

    entries = await asUser(fixture.tenantId, fixture.userId, () => service.listEntries(calendar.id));
    expect(entries).toHaveLength(0);

    const rawCheck = await adminPrisma.holidayCalendarEntry.findUnique({ where: { id: entry.id } });
    expect(rawCheck).toBeNull(); // benar-benar hilang dari tabel, bukan soft-deleted
  });

  it("resolveEffectiveCalendar(): site.holidayCalendarId override -> pakai kalender itu, mengabaikan default tenant", async () => {
    const fixture = await seedTenantFixture();
    const { site } = await seedOrganizationTree(fixture.tenantId, fixture.userId);

    const defaultCal = await asUser(fixture.tenantId, fixture.userId, () => service.createCalendar({ name: "Default Tenant", isDefault: true }));
    const overrideCal = await asUser(fixture.tenantId, fixture.userId, () => service.createCalendar({ name: "Khusus Site" }));
    await adminPrisma.site.update({ where: { id: site.id }, data: { holidayCalendarId: overrideCal.id } });

    const resolved = await asUser(fixture.tenantId, fixture.userId, () => service.resolveEffectiveCalendar(site.id));
    expect(resolved?.id).toBe(overrideCal.id);
    expect(resolved?.id).not.toBe(defaultCal.id);
  });

  it("resolveEffectiveCalendar(): site.holidayCalendarId NULL -> fallback ke kalender default tenant", async () => {
    const fixture = await seedTenantFixture();
    const { site } = await seedOrganizationTree(fixture.tenantId, fixture.userId);
    const defaultCal = await asUser(fixture.tenantId, fixture.userId, () => service.createCalendar({ name: "Default Tenant", isDefault: true }));

    const resolved = await asUser(fixture.tenantId, fixture.userId, () => service.resolveEffectiveCalendar(site.id));
    expect(resolved?.id).toBe(defaultCal.id);
  });

  it("resolveEffectiveCalendar(): tanpa override maupun default tenant -> null (kondisi valid, bukan error)", async () => {
    const fixture = await seedTenantFixture();
    const { site } = await seedOrganizationTree(fixture.tenantId, fixture.userId);

    const resolved = await asUser(fixture.tenantId, fixture.userId, () => service.resolveEffectiveCalendar(site.id));
    expect(resolved).toBeNull();
  });

  it("isBusinessDayForSite(): weekend dan holiday entry site-resolved sama-sama dianggap bukan hari kerja", async () => {
    const fixture = await seedTenantFixture();
    const { site } = await seedOrganizationTree(fixture.tenantId, fixture.userId);
    const calendar = await asUser(fixture.tenantId, fixture.userId, () => service.createCalendar({ name: "Kalender SLA", isDefault: true }));
    await asUser(fixture.tenantId, fixture.userId, () =>
      service.addEntry({ holidayCalendarId: calendar.id, holidayDate: utc(2026, 8, 17), name: "Kemerdekaan", isRecurringYearly: true }),
    );

    // 2026-07-25 = Sabtu (weekend, diverifikasi node Date.UTC).
    expect(await asUser(fixture.tenantId, fixture.userId, () => service.isBusinessDayForSite(site.id, utc(2026, 7, 25)))).toBe(false);
    // 2026-08-17 = Senin, tapi recurring holiday entry.
    expect(await asUser(fixture.tenantId, fixture.userId, () => service.isBusinessDayForSite(site.id, utc(2026, 8, 17)))).toBe(false);
    // 2026-07-27 = Senin biasa, bukan holiday.
    expect(await asUser(fixture.tenantId, fixture.userId, () => service.isBusinessDayForSite(site.id, utc(2026, 7, 27)))).toBe(true);
  });

  it("isolasi tenant: resolveEffectiveCalendar tidak bisa membaca holiday_calendars tenant lain walau site.holiday_calendar_id diarahkan ke sana (RLS, bukan FK, yang jadi jaminan isolasi — pola sama TDD §26 gap #14)", async () => {
    const fixtureA = await seedTenantFixture();
    const fixtureB = await seedTenantFixture();
    const { site: siteA } = await seedOrganizationTree(fixtureA.tenantId, fixtureA.userId);
    const calB = await asUser(fixtureB.tenantId, fixtureB.userId, () => service.createCalendar({ name: "Milik B" }));

    // FK holiday_calendar_id TIDAK menghormati RLS (gap #14, task 0.12) —
    // adminPrisma (role admin, bypass RLS) bisa menulis referensi lintas
    // tenant ini secara paksa; qhse_app TIDAK BISA melakukan hal yang sama
    // lewat service manapun (tidak ada jalur assignment lintas tenant di
    // HolidayCalendarService) — baris ini mensimulasikan skenario itu utk
    // membuktikan RLS (bukan FK) yang benar-benar menutup celahnya.
    await adminPrisma.site.update({ where: { id: siteA.id }, data: { holidayCalendarId: calB.id } });

    const resolvedAsA = await asUser(fixtureA.tenantId, fixtureA.userId, () => service.resolveEffectiveCalendar(siteA.id));
    expect(resolvedAsA).toBeNull(); // RLS memblokir SELECT walau FK "valid"
  });

  it("audit trigger: create/update holiday_calendars tercatat dengan tenant_id terisi benar (beda dari industry_templates)", async () => {
    const fixture = await seedTenantFixture();
    const calendar = await asUser(fixture.tenantId, fixture.userId, () => service.createCalendar({ name: "Diaudit" }));

    const auditRows = await adminPrisma.$queryRaw<Array<{ tenant_id: string | null; actor_user_id: string | null; action: string }>>`
      SELECT tenant_id, actor_user_id, action FROM system_audit_logs
      WHERE entity_type = 'holiday_calendars' AND entity_id = ${calendar.id}::uuid
      ORDER BY created_at
    `;
    expect(auditRows.length).toBeGreaterThanOrEqual(1);
    expect(auditRows[0].action).toBe("INSERT");
    expect(auditRows[0].tenant_id).toBe(fixture.tenantId);
    expect(auditRows[0].actor_user_id).toBe(fixture.userId);
  });
});
