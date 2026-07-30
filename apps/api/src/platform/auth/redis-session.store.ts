import { Injectable } from "@nestjs/common";
import { RedisProvider } from "./redis.provider";
import { SessionRecord, SessionStore } from "./session-store.interface";

// Implementasi SessionStore sungguhan (TDD §12) — key persis
// `session:{user_id}:{session_id}`. TTL per-panggilan `set()` (dihitung
// caller dari PasswordPolicy.sessionTimeoutMinutes, "sesuai session timeout
// per tenant").
@Injectable()
export class RedisSessionStore implements SessionStore {
  constructor(private readonly redis: RedisProvider) {}

  private key(userId: string, sessionId: string): string {
    return `session:${userId}:${sessionId}`;
  }

  async get(userId: string, sessionId: string): Promise<SessionRecord | null> {
    const raw = await this.redis.client.get(this.key(userId, sessionId));
    return raw ? (JSON.parse(raw) as SessionRecord) : null;
  }

  async set(userId: string, sessionId: string, record: SessionRecord, ttlSeconds: number): Promise<void> {
    await this.redis.client.set(this.key(userId, sessionId), JSON.stringify(record), "EX", ttlSeconds);
  }

  async delete(userId: string, sessionId: string): Promise<void> {
    await this.redis.client.del(this.key(userId, sessionId));
  }

  async deleteAllForUser(userId: string): Promise<void> {
    const pattern = `session:${userId}:*`;
    let cursor = "0";
    do {
      const [next, keys] = await this.redis.client.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = next;
      if (keys.length > 0) {
        await this.redis.client.del(...keys);
      }
    } while (cursor !== "0");
  }
}
