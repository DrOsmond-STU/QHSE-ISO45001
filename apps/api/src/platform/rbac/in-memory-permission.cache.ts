import { Injectable } from "@nestjs/common";
import { PermissionCache } from "./permission-cache.interface";
import { ResolvedRoleAssignment } from "./permission-resolution";

interface CacheEntry {
  value: ResolvedRoleAssignment[];
  expiresAt: number;
}

// Shared-hosting adaptation (REDIS_ENABLED=false) — pengganti
// RedisPermissionCache. In-memory (Map), BUKAN DB-backed spt DbSessionStore
// — beda dari SessionStore, cache ini murni optimisasi performa (hilang
// begitu proses restart HANYA berarti PermissionService jatuh balik ke
// query DB langsung sekali, bukan celah keamanan/kehilangan state
// spt sesi). Single-process cPanel Node.js app (Passenger) — tidak ada
// concern konsistensi multi-instance.
@Injectable()
export class InMemoryPermissionCache implements PermissionCache {
  private readonly store = new Map<string, CacheEntry>();

  async get(userId: string): Promise<ResolvedRoleAssignment[] | null> {
    const entry = this.store.get(userId);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(userId);
      return null;
    }
    return entry.value;
  }

  async set(userId: string, value: ResolvedRoleAssignment[], ttlSeconds: number): Promise<void> {
    this.store.set(userId, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async invalidate(userId: string): Promise<void> {
    this.store.delete(userId);
  }
}
