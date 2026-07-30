import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Role } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId, withCleanUniqueViolation } from "./user-role-context";

export class SystemRoleImmutableError extends Error {}

export interface CreateRoleInput {
  roleCode: string;
  name: string;
  description?: string;
}

// Task 1.3 (Modul 02 §6) — write-side roles/role_permissions. BELUM ada
// endpoint HTTP (pola sama 1.1/1.2).
@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  async createRole(input: CreateRoleInput): Promise<Role> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) =>
      withCleanUniqueViolation(
        () =>
          tx.role.create({
            data: { ...input, tenantId, createdBy, updatedBy: createdBy, isSystemRole: false },
          }),
        `role_code "${input.roleCode}" sudah dipakai di tenant ini.`,
      ),
    );
  }

  /** BR-05 (PRD Modul 02 §6) — role sistem HANYA bisa di-clone jadi role
   * kustom baru (basedOnRoleId terisi), tidak pernah diedit langsung.
   * role_permissions role sistem ikut disalin sebagai starting point
   * (matriks awal siap dikustomisasi, bukan role kosong). */
  async cloneSystemRole(systemRoleId: string, newRoleCode: string, newName: string): Promise<Role> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    return this.prisma.withRls(async (tx) => {
      const source = await tx.role.findUnique({ where: { id: systemRoleId } });
      if (!source || !source.isSystemRole) {
        throw new NotFoundException(`role sistem dengan id "${systemRoleId}" tidak ditemukan.`);
      }

      const cloned = await withCleanUniqueViolation(
        () =>
          tx.role.create({
            data: {
              tenantId,
              roleCode: newRoleCode,
              name: newName,
              description: source.description,
              isSystemRole: false,
              basedOnRoleId: source.id,
              createdBy,
              updatedBy: createdBy,
            },
          }),
        `role_code "${newRoleCode}" sudah dipakai di tenant ini.`,
      );

      const sourcePermissions = await tx.rolePermission.findMany({ where: { roleId: source.id } });
      if (sourcePermissions.length > 0) {
        await tx.rolePermission.createMany({
          data: sourcePermissions.map((rp) => ({
            tenantId,
            roleId: cloned.id,
            permissionId: rp.permissionId,
            scopeConstraint: rp.scopeConstraint ?? undefined,
            createdBy,
          })),
        });
      }

      return cloned;
    });
  }

  /** BR-05 — menolak fail-closed kalau target isSystemRole=true (tidak ada
   * jalur "force"). Rekonsiliasi additive/subtractive: permissionIds yang
   * belum ada ditambahkan, yang tidak lagi ada di daftar dihapus — bukan
   * hapus-semua-lalu-insert-ulang (menghindari gap window tanpa permission
   * sama sekali kalau method ini gagal di tengah jalan). */
  async updateRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    await this.prisma.withRls(async (tx) => {
      const role = await tx.role.findUniqueOrThrow({ where: { id: roleId } });
      if (role.isSystemRole) {
        throw new SystemRoleImmutableError(`BR-05: role sistem "${role.roleCode}" tidak bisa diubah role_permissions-nya langsung — clone dulu.`);
      }

      const current = await tx.rolePermission.findMany({ where: { roleId }, select: { permissionId: true } });
      const currentIds = new Set(current.map((c) => c.permissionId));
      const desiredIds = new Set(permissionIds);

      const toAdd = permissionIds.filter((id) => !currentIds.has(id));
      const toRemove = [...currentIds].filter((id) => !desiredIds.has(id));

      if (toRemove.length > 0) {
        await tx.rolePermission.deleteMany({ where: { roleId, permissionId: { in: toRemove } } });
      }
      if (toAdd.length > 0) {
        await tx.rolePermission.createMany({
          data: toAdd.map((permissionId) => ({ tenantId, roleId, permissionId, createdBy })),
        });
      }
    });
  }

  async deactivateRole(roleId: string): Promise<Role> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      const role = await tx.role.findUniqueOrThrow({ where: { id: roleId } });
      if (role.isSystemRole) {
        throw new ConflictException("BR-05: role sistem tidak bisa dinonaktifkan langsung.");
      }
      return tx.role.update({ where: { id: roleId }, data: { status: "INACTIVE", updatedBy } });
    });
  }
}
