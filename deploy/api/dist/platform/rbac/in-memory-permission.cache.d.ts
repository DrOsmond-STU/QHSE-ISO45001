import { PermissionCache } from "./permission-cache.interface";
import { ResolvedRoleAssignment } from "./permission-resolution";
export declare class InMemoryPermissionCache implements PermissionCache {
    private readonly store;
    get(userId: string): Promise<ResolvedRoleAssignment[] | null>;
    set(userId: string, value: ResolvedRoleAssignment[], ttlSeconds: number): Promise<void>;
    invalidate(userId: string): Promise<void>;
}
