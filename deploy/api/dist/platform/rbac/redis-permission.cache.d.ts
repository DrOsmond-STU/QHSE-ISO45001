import { RedisProvider } from "../auth/redis.provider";
import { PermissionCache } from "./permission-cache.interface";
import { ResolvedRoleAssignment } from "./permission-resolution";
export declare class RedisPermissionCache implements PermissionCache {
    private readonly redis;
    constructor(redis: RedisProvider);
    private key;
    get(userId: string): Promise<ResolvedRoleAssignment[] | null>;
    set(userId: string, value: ResolvedRoleAssignment[], ttlSeconds: number): Promise<void>;
    invalidate(userId: string): Promise<void>;
}
