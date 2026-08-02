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
exports.TenantCorsResolverService = void 0;
exports.buildCorsOptions = buildCorsOptions;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const cors_origin_1 = require("./cors-origin");
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
let TenantCorsResolverService = class TenantCorsResolverService {
    adminPrisma;
    webOrigin;
    constructor() {
        this.adminPrisma = new client_1.PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
        this.webOrigin = process.env.WEB_ORIGIN;
    }
    async onModuleDestroy() {
        await this.adminPrisma.$disconnect();
    }
    /**
     * Fast path: origin platform default (WEB_ORIGIN) TANPA query DB —
     * jalur PALING SERING (dev/demo/tenant tanpa custom domain), baru fall
     * back ke DB utk origin yang tidak dikenal. Belum ada caching (gap TDD
     * §26) — jumlah custom_domain diperkirakan kecil di Phase 1, query
     * per-preflight dianggap cukup murah sampai terbukti sebaliknya.
     */
    async isOriginAllowed(origin) {
        if (this.webOrigin && origin === this.webOrigin) {
            return true;
        }
        const hostname = (0, cors_origin_1.extractOriginHostname)(origin);
        if (!hostname) {
            return false;
        }
        const match = await this.adminPrisma.tenantBrandingConfig.findFirst({
            where: { customDomain: hostname },
            select: { id: true },
        });
        return match !== null;
    }
};
exports.TenantCorsResolverService = TenantCorsResolverService;
exports.TenantCorsResolverService = TenantCorsResolverService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], TenantCorsResolverService);
/**
 * Dipakai app.enableCors() DI DUA TEMPAT (main.ts sungguhan +
 * test/auth/test-helpers.ts finishTestApp(), yang eksplisit "mirror
 * bootstrap main.ts") — diekstrak jadi satu factory supaya keduanya tidak
 * bisa drift diam-diam kalau logic CORS berubah lagi nanti.
 */
function buildCorsOptions(corsResolver) {
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
//# sourceMappingURL=tenant-cors-resolver.service.js.map