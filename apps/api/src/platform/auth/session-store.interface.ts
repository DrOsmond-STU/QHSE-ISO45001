// Kontrak sesi (TDD §12 — key pattern `session:{user_id}:{session_id}`).
// Implementasi sungguhan: redis-session.store.ts (ioredis). Interface ini
// dipisah supaya refresh-token.service bisa diuji unit tanpa Redis nyata
// (lihat refresh-token.service.spec.ts — fake in-memory).
export interface SessionRecord {
  tenantId: string;
  currentSecretHash: string;
}

export interface SessionStore {
  get(userId: string, sessionId: string): Promise<SessionRecord | null>;
  set(userId: string, sessionId: string, record: SessionRecord, ttlSeconds: number): Promise<void>;
  delete(userId: string, sessionId: string): Promise<void>;
  deleteAllForUser(userId: string): Promise<void>;
}

// Interface TypeScript tidak punya representasi runtime — Nest DI butuh token
// eksplisit untuk inject implementasi (RedisSessionStore) ke tempat yang
// constructor-nya diketik `SessionStore` (mis. RefreshTokenService, dibangun
// lewat factory provider di auth.module.ts, bukan autowiring biasa).
export const SESSION_STORE = Symbol("SESSION_STORE");
