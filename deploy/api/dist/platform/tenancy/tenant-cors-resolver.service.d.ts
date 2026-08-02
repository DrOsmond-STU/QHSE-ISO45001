import { OnModuleDestroy } from "@nestjs/common";
import { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";
/**
 * TDD §16 — "CORS: whitelist origin per tenant custom domain..., tidak
 * wildcard '*' untuk endpoint berautentikasi." Dipanggil dari main.ts SAAT
 * BOOTSTRAP, SEBELUM request/tenant context apa pun ada (CORS preflight
 * terjadi SEBELUM auth/tenant-resolution middleware jalan) — origin header
 * browser adalah HOSTNAME, bukan tenant_id, jadi justru TIDAK MUNGKIN
 * tahu tenant mana dulu tanpa mencari LINTAS SELURUH tenant lebih dulu.
 * Krn tenant_branding_configs BER-RLS (fail-closed tanpa context tenant),
 * pencarian lintas-tenant ini SECARA STRUKTURAL butuh koneksi admin
 * sendiri (DATABASE_URL, RLS bypass) — pola SAMA PERSIS
 * ProvisioningService (1.5, INSERT tenant pertama) & job cross-tenant
 * (reminder-scan/delegation-scan/usage-counter-scan): keempatnya beda
 * operasi tapi SAMA alasannya (genuinely butuh melihat lintas tenant,
 * bukan celah keamanan). Query DIBATASI KETAT ke SATU kolom (customDomain,
 * cuma return boolean) — TIDAK pernah mengekspos logo_url/primary_color/
 * display_name tenant lain lewat jalur ini.
 */
export declare class TenantCorsResolverService implements OnModuleDestroy {
    private readonly adminPrisma;
    private readonly webOrigin;
    constructor();
    onModuleDestroy(): Promise<void>;
    /**
     * Fast path: origin platform default (WEB_ORIGIN) TANPA query DB —
     * jalur PALING SERING (dev/demo/tenant tanpa custom domain), baru fall
     * back ke DB utk origin yang tidak dikenal. Belum ada caching (gap TDD
     * §26) — jumlah custom_domain diperkirakan kecil di Phase 1, query
     * per-preflight dianggap cukup murah sampai terbukti sebaliknya.
     */
    isOriginAllowed(origin: string): Promise<boolean>;
}
/**
 * Dipakai app.enableCors() DI DUA TEMPAT (main.ts sungguhan +
 * test/auth/test-helpers.ts finishTestApp(), yang eksplisit "mirror
 * bootstrap main.ts") — diekstrak jadi satu factory supaya keduanya tidak
 * bisa drift diam-diam kalau logic CORS berubah lagi nanti.
 */
export declare function buildCorsOptions(corsResolver: TenantCorsResolverService): CorsOptions;
