"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleService = exports.SystemRoleImmutableError = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const user_role_context_1 = require("./user-role-context");
class SystemRoleImmutableError extends Error {
}
exports.SystemRoleImmutableError = SystemRoleImmutableError;
// Task 1.3 (Modul 02 §6) — write-side roles/role_permissions. BELUM ada
// endpoint HTTP (pola sama 1.1/1.2).
let RoleService = class RoleService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createRole(input) {
        const createdBy = (0, user_role_context_1.requireActorUserId)();
        const tenantId = (0, user_role_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => (0, user_role_context_1.withCleanUniqueViolation)(() => tx.role.create({
            data: { ...input, tenantId, createdBy, updatedBy: createdBy, isSystemRole: false },
        }), `role_code "${input.roleCode}" sudah dipakai di tenant ini.`));
    }
    /** BR-05 (PRD Modul 02 §6) — role sistem HANYA bisa di-clone jadi role
     * kustom baru (basedOnRoleId terisi), tidak pernah diedit langsung.
     * role_permissions role sistem ikut disalin sebagai starting point
     * (matriks awal siap dikustomisasi, bukan role kosong). */
    async cloneSystemRole(systemRoleId, newRoleCode, newName) {
        const createdBy = (0, user_role_context_1.requireActorUserId)();
        const tenantId = (0, user_role_context_1.requireTenantId)();
        return this.prisma.withRls(async (tx) => {
            const source = await tx.role.findUnique({ where: { id: systemRoleId } });
            if (!source || !source.isSystemRole) {
                throw new common_1.NotFoundException(`role sistem dengan id "${systemRoleId}" tidak ditemukan.`);
            }
            const cloned = await (0, user_role_context_1.withCleanUniqueViolation)(() => tx.role.create({
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
            }), `role_code "${newRoleCode}" sudah dipakai di tenant ini.`);
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
    async updateRolePermissions(roleId, permissionIds) {
        const createdBy = (0, user_role_context_1.requireActorUserId)();
        const tenantId = (0, user_role_context_1.requireTenantId)();
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
    async deactivateRole(roleId) {
        const updatedBy = (0, user_role_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const role = await tx.role.findUniqueOrThrow({ where: { id: roleId } });
            if (role.isSystemRole) {
                throw new common_1.ConflictException("BR-05: role sistem tidak bisa dinonaktifkan langsung.");
            }
            return tx.role.update({ where: { id: roleId }, data: { status: "INACTIVE", updatedBy } });
        });
    }
};
exports.RoleService = RoleService;
exports.RoleService = RoleService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RoleService);
