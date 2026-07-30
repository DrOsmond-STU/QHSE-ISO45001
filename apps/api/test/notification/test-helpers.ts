import { NotificationChannelCode, NotificationDeliveryMode, NotificationLanguage } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { adminPrisma } from "../auth/test-helpers";

export { adminPrisma, createTestApp, finishTestApp, testingModuleBuilder, seedTenantFixture } from "../auth/test-helpers";
export type { TenantFixture } from "../auth/test-helpers";

export interface SeededUser {
  id: string;
  email: string;
}

export async function seedUserInTenant(tenantId: string, label = "Test User"): Promise<SeededUser> {
  const email = `${label.toLowerCase().replace(/\s+/g, "-")}-${randomUUID()}@qhse.local`;
  const user = await adminPrisma.user.create({
    data: { tenantId, email, fullName: label, status: "ACTIVE" },
  });
  return { id: user.id, email: user.email };
}

export async function seedNotificationChannel(tenantId: string, channelCode: NotificationChannelCode, isEnabled = true) {
  return adminPrisma.notificationChannel.create({ data: { tenantId, channelCode, isEnabled } });
}

export interface SeedTemplateOptions {
  eventType?: string;
  channelCode?: NotificationChannelCode;
  language?: NotificationLanguage;
  subjectTemplate?: string | null;
  bodyTemplate?: string;
  isActive?: boolean;
}

/**
 * `tenantId` WAJIB eksplisit (bukan default/opsional) — baris tenantId
 * NULL (template default sistem) bersifat GLOBAL, TIDAK diisolasi per
 * fixture tenant fresh-random seperti baris ber-tenant, jadi kalau
 * eventType-nya literal tetap akan bentrok partial unique index
 * (event_type,channel_code,language) WHERE tenant_id IS NULL di run test
 * BERIKUTNYA (DB test lokal ini tidak di-flush antar run, beda dari
 * Testcontainers ephemeral — lihat catatan di
 * test/rls/generic-tenant-isolation.integration-spec.ts). Test yang
 * sengaja menguji fallback ke default sistem (tenantId: null) WAJIB pakai
 * eventType yang di-randomUUID() di call site, bukan literal tetap. Test
 * lain yang cuma butuh "ada template apa saja" cukup pakai
 * `tenantId: fixture.tenantId` (fresh random per test, aman tanpa perlu
 * randomize eventType manual). Default pattern template pakai `{{name}}`
 * — cocok dengan `variables` default yang dipakai test di folder ini.
 */
export async function seedNotificationTemplate(tenantId: string | null, options: SeedTemplateOptions = {}) {
  return adminPrisma.notificationTemplate.create({
    data: {
      tenantId,
      eventType: options.eventType ?? `TEST_EVENT_${randomUUID()}`,
      channelCode: options.channelCode ?? "IN_APP",
      language: options.language ?? "ID",
      subjectTemplate: options.subjectTemplate === undefined ? "Judul {{name}}" : options.subjectTemplate,
      bodyTemplate: options.bodyTemplate ?? "Isi pesan untuk {{name}}.",
      isActive: options.isActive ?? true,
    },
  });
}

export interface SeedPreferenceOptions {
  eventCategory?: string;
  channelCode?: NotificationChannelCode;
  isEnabled?: boolean;
  deliveryMode?: NotificationDeliveryMode;
  quietHoursStart?: Date | null;
  quietHoursEnd?: Date | null;
}

export async function seedNotificationPreference(tenantId: string, userId: string, options: SeedPreferenceOptions = {}) {
  return adminPrisma.notificationPreference.create({
    data: {
      tenantId,
      userId,
      eventCategory: options.eventCategory ?? "TEST_CATEGORY",
      channelCode: options.channelCode ?? "EMAIL",
      isEnabled: options.isEnabled ?? true,
      deliveryMode: options.deliveryMode ?? "REAL_TIME",
      quietHoursStart: options.quietHoursStart ?? null,
      quietHoursEnd: options.quietHoursEnd ?? null,
    },
  });
}

/** `@db.Time` Prisma disimpan sbg Date, cuma komponen jam:menit UTC yang
 * berarti — konstruksi eksplisit UTC supaya tidak bergeser oleh timezone
 * lokal mesin yang menjalankan test (lihat toQuietHoursWindow() di
 * notification.service.ts, konsumen nilai yang sama). */
export function utcTime(hours: number, minutes: number): Date {
  return new Date(Date.UTC(1970, 0, 1, hours, minutes));
}

/** Menit sejak tengah malam (bisa negatif/>1439, mis. "sekarang - 2") ->
 * Date @db.Time, wrap around tengah malam otomatis. */
export function minutesToUtcTime(totalMinutes: number): Date {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  return utcTime(Math.floor(wrapped / 60), wrapped % 60);
}
