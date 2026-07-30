import { ScopeType } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { adminPrisma } from "../auth/test-helpers";
import { seedRbacBaseline, SUPER_ADMIN_PLATFORM_ROLE_CODE } from "../../prisma/seed-rbac-baseline";
import { MfaService } from "../../src/platform/auth/mfa.service";

export { adminPrisma, createTestApp, finishTestApp, testingModuleBuilder } from "../auth/test-helpers";
export { seedRbacBaseline, SUPER_ADMIN_PLATFORM_ROLE_CODE, PERMISSION_MANAGE_CODE } from "../../prisma/seed-rbac-baseline";

const mfaService = new MfaService();

/**
 * Assign role SUPER_ADMIN_PLATFORM (scope TENANT) ke user fixture — dipakai
 * test guard/fail-closed yang butuh user dgn permission
 * user_mgmt.permission.manage.
 *
 * PENTING (task 0.8): begitu user jadi SUPER_ADMIN_PLATFORM, login mereka
 * SEKARANG mewajibkan MFA tanpa pengecualian (task 0.7, cek sungguhan lewat
 * role — lihat auth.service.ts#isSuperAdminPlatform). Helper ini otomatis
 * enroll MFA juga (bukan cuma assign role) supaya fixture tetap bisa login
 * end-to-end di test HTTP; mengembalikan totpSecret untuk generate kode.
 */
export async function assignSuperAdminPlatformRole(userId: string, tenantId: string): Promise<{ totpSecret: string }> {
  await seedRbacBaseline(adminPrisma);
  const role = await adminPrisma.role.findFirstOrThrow({
    where: { tenantId: null, roleCode: SUPER_ADMIN_PLATFORM_ROLE_CODE },
  });
  await adminPrisma.userRole.create({
    data: { tenantId, userId, roleId: role.id, scopeType: "TENANT", scopeId: null },
  });

  const totpSecret = mfaService.generateSecret();
  await adminPrisma.user.update({
    where: { id: userId },
    data: { mfaEnabled: true, mfaSecretEncrypted: mfaService.encryptSecret(totpSecret) },
  });
  return { totpSecret };
}

/** Buat role kustom tenant-scoped (bukan system role) dengan 1 permission,
 * assign ke user dengan scope tertentu — dipakai test scope-filter-primitive. */
export async function seedCustomScopedRole(params: {
  tenantId: string;
  userId: string;
  permissionCode: string;
  scopeType: ScopeType;
  scopeId: string | null;
}): Promise<void> {
  const permission = await adminPrisma.permission.upsert({
    where: { permissionCode: params.permissionCode },
    update: {},
    create: {
      permissionCode: params.permissionCode,
      moduleCode: params.permissionCode.split(".")[0],
      entity: params.permissionCode.split(".")[1] ?? "entity",
      action: params.permissionCode.split(".")[2] ?? "ACTION",
    },
  });

  const role = await adminPrisma.role.create({
    data: {
      tenantId: params.tenantId,
      roleCode: `CUSTOM_${randomUUID().slice(0, 8)}`,
      name: "Custom Test Role",
      isSystemRole: false,
    },
  });

  await adminPrisma.rolePermission.create({
    data: { tenantId: params.tenantId, roleId: role.id, permissionId: permission.id },
  });

  await adminPrisma.userRole.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId,
      roleId: role.id,
      scopeType: params.scopeType,
      scopeId: params.scopeId,
    },
  });
}
