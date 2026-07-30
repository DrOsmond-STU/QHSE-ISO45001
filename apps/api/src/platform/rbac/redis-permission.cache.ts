import { Injectable } from "@nestjs/common";
import { RedisProvider } from "../auth/redis.provider";
import { PermissionCache } from "./permission-cache.interface";
import { ResolvedRoleAssignment } from "./permission-resolution";

// TDD §12 — key persis `perm:{user_id}`.
@Injectable()
export class RedisPermissionCache implements PermissionCache {
  constructor(private readonly redis: RedisProvider) {}

  private key(userId: string): string {
    return `perm:${userId}`;
  }

  async get(userId: string): Promise<ResolvedRoleAssignment[] | null> {
    const raw = await this.redis.client.get(this.key(userId));
    return raw ? (JSON.parse(raw) as ResolvedRoleAssignment[]) : null;
  }

  async set(userId: string, value: ResolvedRoleAssignment[], ttlSeconds: number): Promise<void> {
    await this.redis.client.set(this.key(userId), JSON.stringify(value), "EX", ttlSeconds);
  }

  async invalidate(userId: string): Promise<void> {
    await this.redis.client.del(this.key(userId));
  }
}
