import { ScopeType, User, UserRole, UserType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { AuditLogService } from "../../../platform/audit-log/audit-log.service";
export interface InviteUserInput {
    email: string;
    fullName: string;
    employeeId?: string;
    username?: string;
    phoneNumber?: string;
    userType?: UserType;
    departmentId?: string;
    siteId?: string;
    positionId?: string;
    jobTitle?: string;
    reportingToUserId?: string;
}
export interface SyncFromHrisInput {
    departmentId?: string;
    siteId?: string;
    positionId?: string;
    jobTitle?: string;
    reportingToUserId?: string;
    hrisSyncSource: string;
}
export interface AssignRoleInput {
    userId: string;
    roleId: string;
    scopeType: ScopeType;
    scopeId?: string;
    validFrom?: Date;
    validTo?: Date;
}
export declare class UserService {
    private readonly prisma;
    private readonly auditLogService;
    constructor(prisma: PrismaService, auditLogService: AuditLogService);
    /** PRD Modul 02 §4.1 langkah 1 — status awal selalu INVITED, invitedAt
     * diisi. Password/aktivasi ditangani alur login (platform/auth/*, task
     * 0.6) yang SUDAH ADA — TIDAK diubah task ini (gap TDD §26, mengikuti
     * disiplin yang sama seperti sso_mappings: primitif lifecycle disiapkan
     * di sini, wiring ke titik "first successful login" bukan cakupan
     * modul domain, itu perubahan platform/auth cross-cutting). */
    inviteUser(input: InviteUserInput): Promise<User>;
    activateUser(userId: string): Promise<User>;
    /** PRD Modul 02 §4.2 — ACTIVE->SUSPENDED, reason WAJIB (free text,
     * dicatat system_audit_logs) + seluruh user_sessions aktif di-revoke
     * otomatis. Trigger audit_log_capture() (0.13) sudah menangkap
     * before/after baris users secara otomatis — reason (bukan kolom
     * users) dicatat TERPISAH lewat AuditLogService.record() (pola sama
     * banner comment-nya: "aksi semantik yang bukan mutasi baris
     * sederhana"). */
    suspendUser(userId: string, reason: string): Promise<User>;
    /** SUSPENDED->ACTIVE — reaktivasi langsung (BR-02), beda dari
     * DEACTIVATED->ACTIVE yang TIDAK diizinkan sama sekali (lihat
     * user-lifecycle.ts). */
    reactivateUser(userId: string): Promise<User>;
    /** PRD Modul 02 §4.2 — (ACTIVE|SUSPENDED)->DEACTIVATED, bersifat
     * mendekati terminal (offboarding). Memicu OTOMATIS: revoke seluruh
     * sesi, user_roles->INACTIVE (BUKAN dihapus, demi audit trail — literal
     * PRD). Notifikasi ke reporting_to_user_id/Tenant Admin (§4.2) SENGAJA
     * belum di-wire (gap TDD §26) — template notifikasi spesifik tidak ada
     * di katalog literal §8, menebak isinya berisiko salah. */
    deactivateUser(userId: string): Promise<User>;
    /** PRD Modul 02 §7 — sinkronisasi subset HRIS (employee_id/department_id/
     * reporting_to_user_id/job_title), BUKAN pengganti HRIS (Non-Goals §2.2).
     * employeeId SENGAJA tidak diubah di sini (BR-09 unique identifier,
     * perubahan employee_id pasca-provisioning di luar cakupan "sinkron"
     * literal PRD — kalau memang berubah, itu perbaikan data manual bukan
     * sync rutin). */
    syncFromHris(userId: string, input: SyncFromHrisInput): Promise<User>;
    /** BR-03 (PRD Modul 02 §6) — scope_id WAJIB tervalidasi konsisten:
     * entitas yang dirujuk harus benar-benar berada di tenant_id yang sama.
     * Query LANGSUNG ke tabel companies/branches/sites/departments (BUKAN
     * impor OrganizationService) — pola SAMA PERSIS
     * platform/rbac/prisma-scope-hierarchy.resolver.ts (task 1.1): modul
     * lain yang butuh data organisasi query Prisma langsung, bukan lewat
     * service class modul lain, supaya tidak menambah coupling antar modul
     * domain yang tidak perlu. */
    assignRole(input: AssignRoleInput): Promise<UserRole>;
    revokeRole(userRoleId: string): Promise<UserRole>;
    /** BR-03 — `tx` di sini SELALU tx ber-RLS (dipanggil dari dalam
     * withRls() callback), jadi query di bawah TIDAK PERNAH bisa
     * mengembalikan baris milik tenant lain sama sekali — RLS sudah
     * memfilternya SEBELUM sampai ke perbandingan row.tenantId!==tenantId
     * (dibuktikan empiris lewat test: scope_id lintas tenant menghasilkan
     * NotFoundException, bukan pernah mencapai baris BadRequestException di
     * bawah). Efek sampingnya JUSTRU baik: caller tidak bisa membedakan
     * "scope_id tidak ada" dari "scope_id ada tapi milik tenant lain" —
     * mencegah kebocoran informasi keberadaan entitas lintas tenant lewat
     * pesan error. Perbandingan eksplisit TETAP dipertahankan (bukan dihapus)
     * sebagai defense-in-depth kalau method ini kelak direfactor memakai
     * koneksi non-RLS secara tidak sengaja. */
    private assertScopeBelongsToTenant;
}
