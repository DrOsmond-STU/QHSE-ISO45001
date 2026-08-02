import { PrismaService } from "../tenancy/prisma.service";
import { PermissionRepository } from "./permission-repository.interface";
import { ResolvedRoleAssignment } from "./permission-resolution";
export declare class PrismaPermissionRepository implements PermissionRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    resolveUserRoleAssignments(userId: string, tenantId: string): Promise<ResolvedRoleAssignment[]>;
}
