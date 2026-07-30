import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import cookieParser from "cookie-parser";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import Redis from "ioredis";
import { authenticator } from "otplib";
import { AppModule } from "../../src/app.module";
import { MfaService } from "../../src/platform/auth/mfa.service";
import { buildCorsOptions, TenantCorsResolverService } from "../../src/platform/tenancy/tenant-cors-resolver.service";
import { seedRbacBaseline, SUPER_ADMIN_PLATFORM_ROLE_CODE } from "../../prisma/seed-rbac-baseline";

// Sama seperti test/rls/generic-tenant-isolation.integration-spec.ts — Prisma
// client mentah (bukan lewat Nest DI) via DATABASE_URL (role admin, bypass
// RLS) khusus untuk seeding fixture test.
export const adminPrisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

/** Builder mentah (sebelum .compile()) — dipakai test yang butuh
 * .overrideProvider(...) (mis. test/rbac/permission-fail-closed, simulasi
 * Redis/DB down via DI fault injection, bukan mematikan proses infra
 * sungguhan yang dipakai bareng file test lain). */
export function testingModuleBuilder() {
  return Test.createTestingModule({ imports: [AppModule] });
}

/** Selesaikan TestingModule yang sudah di-compile jadi INestApplication siap
 * pakai — mirror bootstrap main.ts (Test.createTestingModule tidak
 * menjalankan bootstrap() sungguhan). */
export async function finishTestApp(moduleRef: TestingModule): Promise<INestApplication> {
  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  // Task 1.6 — CORS (TDD §16), lihat banner comment buildCorsOptions().
  app.enableCors(buildCorsOptions(app.get(TenantCorsResolverService)));
  await app.init();
  return app;
}

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await testingModuleBuilder().compile();
  return finishTestApp(moduleRef);
}

export interface TenantFixture {
  tenantId: string;
  userId: string;
  email: string;
  password: string;
}

/**
 * Task 1.1 — users.tenant_id kini FK ke tenants (sebelumnya bare UUID sejak
 * 0.6). Baris `tenants` minimal WAJIB ada dulu sebelum user manapun dibuat
 * dengan tenantId itu (FK constraint), jadi setiap fixture yang bikin user
 * baru panggil ini duluan. tenantCode di bawah 30 char (VARCHAR(30)) —
 * randomUUID() penuh (36 char) TERLALU PANJANG, jadi dipendekkan.
 */
async function seedTenant(tenantId: string): Promise<void> {
  await adminPrisma.tenant.create({
    data: {
      id: tenantId,
      tenantCode: `TEST-${randomUUID().slice(0, 20)}`,
      legalName: "PT Fixture Test",
      displayName: "Fixture Test",
    },
  });
}

export async function seedTenantFixture(
  overrides: { maxFailedAttempts?: number; lockoutDurationMinutes?: number; sessionTimeoutMinutes?: number } = {},
): Promise<TenantFixture> {
  const tenantId = randomUUID();
  const email = `test-${randomUUID()}@qhse.local`;
  const password = "Str0ng!TestPassw0rd";

  await seedTenant(tenantId);

  await adminPrisma.passwordPolicy.create({
    data: {
      tenantId,
      maxFailedAttempts: overrides.maxFailedAttempts ?? 5,
      lockoutDurationMinutes: overrides.lockoutDurationMinutes ?? 30,
      sessionTimeoutMinutes: overrides.sessionTimeoutMinutes ?? 60,
    },
  });

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await adminPrisma.user.create({
    data: { tenantId, email, fullName: "Test Fixture User", status: "ACTIVE", passwordHash },
  });

  return { tenantId, userId: user.id, email, password };
}

const mfaService = new MfaService();

export interface SysadminFixture extends TenantFixture {
  totpSecret: string;
}

/** Task 0.8 — assign role sistem SUPER_ADMIN_PLATFORM (scope TENANT) ke
 * user, pengganti placeholder `isSysadmin` (task 0.7, sudah dipensiunkan). */
async function assignSuperAdminPlatformRole(userId: string, tenantId: string): Promise<void> {
  await seedRbacBaseline(adminPrisma);
  const role = await adminPrisma.role.findFirstOrThrow({
    where: { tenantId: null, roleCode: SUPER_ADMIN_PLATFORM_ROLE_CODE },
  });
  await adminPrisma.userRole.create({
    data: { tenantId, userId, roleId: role.id, scopeType: "TENANT", scopeId: null },
  });
}

export async function seedSysadminFixture(): Promise<SysadminFixture> {
  const tenantId = randomUUID();
  const email = `sysadmin-${randomUUID()}@qhse.local`;
  const password = "Str0ng!TestPassw0rd";

  await seedTenant(tenantId);

  await adminPrisma.passwordPolicy.create({ data: { tenantId } });

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const totpSecret = mfaService.generateSecret();
  const user = await adminPrisma.user.create({
    data: {
      tenantId,
      email,
      fullName: "Test Fixture Sysadmin",
      status: "ACTIVE",
      passwordHash,
      mfaEnabled: true,
      mfaSecretEncrypted: mfaService.encryptSecret(totpSecret),
    },
  });
  await assignSuperAdminPlatformRole(user.id, tenantId);

  return { tenantId, userId: user.id, email, password, totpSecret };
}

/** Sysadmin fixture yang BELUM enroll MFA (mfaEnabled=false) — untuk uji
 * "login sysadmin tanpa MFA ditolak" (acceptance criterion task 0.7). */
export async function seedSysadminWithoutMfaFixture(): Promise<TenantFixture> {
  const tenantId = randomUUID();
  const email = `sysadmin-nomfa-${randomUUID()}@qhse.local`;
  const password = "Str0ng!TestPassw0rd";

  await seedTenant(tenantId);

  await adminPrisma.passwordPolicy.create({ data: { tenantId } });

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await adminPrisma.user.create({
    data: { tenantId, email, fullName: "Test Fixture Sysadmin (No MFA)", status: "ACTIVE", passwordHash },
  });
  await assignSuperAdminPlatformRole(user.id, tenantId);

  return { tenantId, userId: user.id, email, password };
}

export function generateTotpCode(secret: string): string {
  return authenticator.generate(secret);
}

export function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function extractCookie(setCookieHeader: string | string[] | undefined, name: string): string | undefined {
  const values = Array.isArray(setCookieHeader) ? setCookieHeader : setCookieHeader ? [setCookieHeader] : [];
  const raw = values.find((c) => c.startsWith(`${name}=`));
  if (!raw) return undefined;
  return raw.split(";")[0].slice(name.length + 1);
}

// Redis dipakai murni cache/session store (TDD §12) — aman di-flush penuh di
// awal tiap file test untuk state bersih (bukan source of truth).
export async function flushTestRedis(): Promise<void> {
  const redis = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
  await redis.flushdb();
  await redis.quit();
}
