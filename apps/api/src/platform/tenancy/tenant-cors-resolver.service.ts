import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";
import { PrismaClient } from "@prisma/client";
import { extractOriginHostname } from "./cors-origin";

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
@Injectable()
export class TenantCorsResolverService implements OnModuleDestroy {
  private readonly adminPrisma: PrismaClient;
  private readonly webOrigin: string | undefined;

  constructor() {
    this.adminPrisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    this.webOrigin = process.env.WEB_ORIGIN;
  }

  async onModuleDestroy(): Promise<void> {
    await this.adminPrisma.$disconnect();
  }

  /**
   * Fast path: origin platform default (WEB_ORIGIN) TANPA query DB —
   * jalur PALING SERING (dev/demo/tenant tanpa custom domain), baru fall
   * back ke DB utk origin yang tidak dikenal. Belum ada caching (gap TDD
   * §26) — jumlah custom_domain diperkirakan kecil di Phase 1, query
   * per-preflight dianggap cukup murah sampai terbukti sebaliknya.
   */
  async isOriginAllowed(origin: string): Promise<boolean> {
    if (this.webOrigin && origin === this.webOrigin) {
      return true;
    }

    const hostname = extractOriginHostname(origin);
    if (!hostname) {
      return false;
    }

    const match = await this.adminPrisma.tenantBrandingConfig.findFirst({
      where: { customDomain: hostname },
      select: { id: true },
    });
    return match !== null;
  }
}

/**
 * Dipakai app.enableCors() DI DUA TEMPAT (main.ts sungguhan +
 * test/auth/test-helpers.ts finishTestApp(), yang eksplisit "mirror
 * bootstrap main.ts") — diekstrak jadi satu factory supaya keduanya tidak
 * bisa drift diam-diam kalau logic CORS berubah lagi nanti.
 */
export function buildCorsOptions(corsResolver: TenantCorsResolverService): CorsOptions {
  return {
    origin: (origin, callback) => {
      if (!origin) {
        // Request non-browser (server-to-server, curl, mobile native) —
        // CORS murni mekanisme browser, tidak relevan di sini.
        callback(null, true);
        return;
      }
      corsResolver
        .isOriginAllowed(origin)
        .then((allowed) => callback(allowed ? null : new Error(`CORS: origin "${origin}" tidak diizinkan.`), allowed))
        .catch((err) => callback(err, false));
    },
    credentials: true,
  };
}
