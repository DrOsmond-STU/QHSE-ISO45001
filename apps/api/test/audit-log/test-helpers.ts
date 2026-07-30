import { randomUUID } from "node:crypto";
import { observabilityContextStorage } from "../../src/platform/observability/request-context";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";

export { adminPrisma, createTestApp, finishTestApp, testingModuleBuilder, seedTenantFixture } from "../auth/test-helpers";
export type { TenantFixture } from "../auth/test-helpers";

export interface RequestSimFixture {
  tenantId: string;
  userId: string;
  correlationId: string;
  ipAddress: string;
  userAgent: string;
}

export function buildRequestSimFixture(overrides: Partial<RequestSimFixture> = {}): RequestSimFixture {
  return {
    tenantId: overrides.tenantId ?? randomUUID(),
    userId: overrides.userId ?? randomUUID(),
    correlationId: overrides.correlationId ?? randomUUID(),
    ipAddress: overrides.ipAddress ?? "203.0.113.42",
    userAgent: overrides.userAgent ?? "jest-integration-test/1.0",
  };
}

/**
 * Simulasi konteks satu request HTTP lengkap (tenancy + observability, dua
 * AsyncLocalStorage independen — lihat app.module.ts) — dipakai test yang
 * butuh membuktikan withRls() benar-benar meneruskan SEMUA field ke trigger
 * audit_log_capture() (bukan cuma tenant_id, pola sudah ada sejak 0.2).
 */
export function runAsRequest<T>(fixture: RequestSimFixture, fn: () => Promise<T>): Promise<T> {
  return tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
    observabilityContextStorage.run(
      { correlationId: fixture.correlationId, ipAddress: fixture.ipAddress, userAgent: fixture.userAgent },
      fn,
    ),
  );
}
