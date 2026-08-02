import { ResolvedRoleAssignment } from "./permission-resolution";
export interface PermissionRepository {
    resolveUserRoleAssignments(userId: string, tenantId: string): Promise<ResolvedRoleAssignment[]>;
}
export declare const PERMISSION_REPOSITORY: unique symbol;
