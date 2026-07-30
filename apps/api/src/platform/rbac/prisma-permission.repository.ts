import { Injectable } from "@nestjs/common";
import { PrismaService } from "../tenancy/prisma.service";
import { tenantContextStorage } from "../tenancy/tenant-context";
import { PermissionRepository } from "./permission-repository.interface";
import { ResolvedRoleAssignment } from "./permission-resolution";

@Injectable()
export class PrismaPermissionRepository implements PermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async resolveUserRoleAssignments(userId: string, tenantId: string): Promise<ResolvedRoleAssignment[]> {
    const today = new Date();

    const userRoles = await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls((tx) =>
        tx.userRole.findMany({
          where: {
            userId,
            status: "ACTIVE",
            validFrom: { lte: today },
            OR: [{ validTo: null }, { validTo: { gte: today } }],
            role: { status: "ACTIVE" },
          },
          include: {
            role: {
              include: {
                rolePermissions: {
                  where: { permission: { isActive: true } },
                  include: { permission: true },
                },
              },
            },
          },
        }),
      ),
    );

    return userRoles.map((ur) => ({
      roleId: ur.role.id,
      roleCode: ur.role.roleCode,
      scopeType: ur.scopeType,
      scopeId: ur.scopeId,
      permissionCodes: ur.role.rolePermissions.map((rp) => rp.permission.permissionCode),
    }));
  }
}
