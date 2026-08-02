"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const app_module_1 = require("./app.module");
const app_logger_service_1 = require("./platform/observability/app-logger.service");
const tenant_cors_resolver_service_1 = require("./platform/tenancy/tenant-cors-resolver.service");
async function bootstrap() {
    // bufferLogs:true — log yang terjadi SEBELUM useLogger() (mis. selama
    // resolusi DI module lain) ditampung dulu, di-flush begitu AppLoggerService
    // terpasang, bukan hilang/jatuh ke logger default Nest (TDD §15 — seluruh
    // log aplikasi WAJIB lewat Pino terstruktur, termasuk log bootstrap).
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { bufferLogs: true });
    app.useLogger(app.get(app_logger_service_1.AppLoggerService));
    // TRUST_PROXY — WAJIB diisi kalau API berjalan di belakang reverse proxy
    // (mis. Apache mod_proxy di shared hosting cPanel). Tanpa ini Express
    // melaporkan `req.ip` = 127.0.0.1 untuk SEMUA permintaan, sehingga kolom
    // `ip_address` pada user_sessions — yang memang sengaja direkam sebagai
    // jejak audit — berisi alamat proxy, bukan alamat pengguna. Sengaja TIDAK
    // dinyalakan secara default: mempercayai header X-Forwarded-For saat TIDAK
    // ada proxy di depan berarti klien mana pun bisa memalsukan alamatnya
    // sendiri. Isi dengan jumlah hop proxy (biasanya "1") atau "true".
    const trustProxy = process.env.TRUST_PROXY;
    if (trustProxy) {
        app.set("trust proxy", /^\d+$/.test(trustProxy) ? parseInt(trustProxy, 10) : trustProxy);
    }
    // Task 0.6 — refresh token httpOnly cookie (CSRF stance, lihat
    // platform/auth/auth.controller.ts).
    app.use((0, cookie_parser_1.default)());
    // Task 0.6 — DTO login/token butuh whitelist (TDD §16: tolak field yang
    // tidak dikenal, bukan cuma diabaikan diam-diam).
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    // credentials:true wajib supaya browser kirim cookie refresh token lintas
    // origin web(3000)<->api(3001) saat dev; origin dibatasi eksplisit (TDD
    // §16 — tidak wildcard "*" untuk endpoint berautentikasi). Task 1.6 —
    // origin callback ASYNC (cors package/Nest mendukungnya) supaya bisa
    // whitelist tenant_branding_configs.custom_domain, bukan cuma WEB_ORIGIN
    // statis — lihat TenantCorsResolverService utk alasan lengkap kenapa ini
    // butuh koneksi admin (RLS bypass) di level bootstrap.
    app.enableCors((0, tenant_cors_resolver_service_1.buildCorsOptions)(app.get(tenant_cors_resolver_service_1.TenantCorsResolverService)));
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
    await app.listen(port);
    // eslint-disable-next-line no-console
    console.log(`[qhse-api] listening on :${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map