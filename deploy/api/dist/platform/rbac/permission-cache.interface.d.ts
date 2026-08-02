import { ResolvedRoleAssignment } from "./permission-resolution";
export interface PermissionCache {
    get(userId: string): Promise<ResolvedRoleAssignment[] | null>;
    set(userId: string, value: ResolvedRoleAssignment[], ttlSeconds: number): Promise<void>;
    invalidate(userId: string): Promise<void>;
}
export declare const PERMISSION_CACHE: unique symbol;
