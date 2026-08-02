import { PrismaService } from "../tenancy/prisma.service";
export declare class EntitlementCheckService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    /**
     * Tenant yang BELUM PERNAH punya `tenant_subscriptions` sama sekali
     * (seluruh tenant lama pra-1.5, tiap fixture test 0.1-1.4) lolos TANPA
     * syarat (fail OPEN utk kasus ini SECARA SENGAJA) — supaya provisioning
     * formal tidak diam-diam jadi migrasi wajib retroaktif utk seluruh
     * tenant lama, gap didokumentasikan TDD §26. Tenant yang SUDAH punya
     * minimal 1 baris `tenant_subscriptions` (APAPUN statusnya —
     * `module_entitlements` adalah snapshot POINT-IN-TIME, bukan
     * re-derivasi dari status subscription terkini) baru tunduk fail-closed:
     * baris `module_entitlements` TIDAK ADA ATAU `is_enabled=false` ->
     * DITOLAK.
     */
    isModuleEnabledForTenant(tenantId: string, moduleCode: string): Promise<boolean>;
    /** permission_code (mis. "user_mgmt.permission.manage") DAN module_code
     * (mis. "USER_MGMT") TIDAK selalu casing-identik (dibuktikan empiris:
     * prefix permission_code sebelum titik pertama "user_mgmt" LOWERCASE,
     * sementara Permission.moduleCode tersimpan "USER_MGMT" UPPERCASE) —
     * jadi module_code diresolusi lewat lookup katalog `permissions`
     * (kolom moduleCode yang SUDAH didenormalisasi di tiap baris permission
     * sejak 0.8), BUKAN string-parsing prefix permission_code. Tabel
     * `permissions` GLOBAL tanpa RLS (0.8) — query langsung, tanpa withRls(). */
    resolveModuleCodeForPermission(permissionCode: string): Promise<string | null>;
}
