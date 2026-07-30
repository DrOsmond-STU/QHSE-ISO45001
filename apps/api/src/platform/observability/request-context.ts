import { AsyncLocalStorage } from "node:async_hooks";

// Task 0.13 (TDD §15) — konteks observability per-request: correlationId
// (header X-Correlation-Id, lintas HTTP→DB→job queue), ipAddress/userAgent
// (kolom literal system_audit_logs, Master PRD §11.6). Store TERPISAH dari
// tenancy/tenant-context.ts (tenantId/userId, task 0.2/0.13) — dua concern
// berbeda (identitas vs jejak request), sama-sama dibaca AppLoggerService &
// PrismaService.withRls() untuk menyusun log/audit row yang lengkap.
export interface ObservabilityContextStore {
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}

export const observabilityContextStorage = new AsyncLocalStorage<ObservabilityContextStore>();

export function getCurrentCorrelationId(): string | undefined {
  return observabilityContextStorage.getStore()?.correlationId;
}

export function getCurrentIpAddress(): string | undefined {
  return observabilityContextStorage.getStore()?.ipAddress;
}

export function getCurrentUserAgent(): string | undefined {
  return observabilityContextStorage.getStore()?.userAgent;
}
