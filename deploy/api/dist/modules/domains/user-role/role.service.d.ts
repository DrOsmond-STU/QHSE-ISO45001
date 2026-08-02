import { Role } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export declare class SystemRoleImmutableError extends Error {
}
export interface CreateRoleInput {
    roleCode: string;
    name: string;
    description?: string;
}
export declare class RoleService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createRole(input: CreateRoleInput): Promise<Role>;
    /** BR-05 (PRD Modul 02 §6) — role sistem HANYA bisa di-clone jadi role
     * kustom baru (basedOnRoleId terisi), tidak pernah diedit langsung.
     * role_permissions role sistem ikut disalin sebagai starting point
     * (matriks awal siap dikustomisasi, bukan role kosong). */
    cloneSystemRole(systemRoleId: string, newRoleCode: string, newName: string): Promise<Role>;
    /** BR-05 — menolak fail-closed kalau target isSystemRole=true (tidak ada
     * jalur "force"). Rekonsiliasi additive/subtractive: permissionIds yang
     * belum ada ditambahkan, yang tidak lagi ada di daftar dihapus — bukan
     * hapus-semua-lalu-insert-ulang (menghindari gap window tanpa permission
     * sama sekali kalau method ini gagal di tengah jalan). */
    updateRolePermissions(roleId: string, permissionIds: string[]): Promise<void>;
    deactivateRole(roleId: string): Promise<Role>;
}
