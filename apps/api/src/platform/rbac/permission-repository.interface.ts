import { ResolvedRoleAssignment } from "./permission-resolution";

export interface PermissionRepository {
  resolveUserRoleAssignments(userId: string, tenantId: string): Promise<ResolvedRoleAssignment[]>;
}

export const PERMISSION_REPOSITORY = Symbol("PERMISSION_REPOSITORY");
