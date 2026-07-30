import { ResolvedRoleAssignment } from "./permission-resolution";

// Mirror pola session-store.interface.ts (task 0.6) — interface terpisah
// supaya PermissionService bisa diuji unit tanpa Redis nyata.
export interface PermissionCache {
  get(userId: string): Promise<ResolvedRoleAssignment[] | null>;
  set(userId: string, value: ResolvedRoleAssignment[], ttlSeconds: number): Promise<void>;
  invalidate(userId: string): Promise<void>;
}

export const PERMISSION_CACHE = Symbol("PERMISSION_CACHE");
