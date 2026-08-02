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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppLoggerService = void 0;
const common_1 = require("@nestjs/common");
const pino_1 = __importDefault(require("pino"));
const tenant_context_1 = require("../tenancy/tenant-context");
const request_context_1 = require("./request-context");
// TDD §15 — "Structured JSON log (Pino), setiap log wajib menyertakan
// tenant_id, user_id, correlation_id, module, action". Field 5 itu diinjeksi
// OTOMATIS dari AsyncLocalStorage (tenancy/tenant-context.ts +
// observability/request-context.ts) — pemanggil TIDAK PERNAH perlu
// meneruskannya manual, sama prinsipnya dengan tenantId di PrismaService.
//
// Dipasang sebagai logger global Nest via app.useLogger() (main.ts) SEKALIGUS
// diinject langsung ke service manapun yang butuh log bisnis terstruktur
// (mis. audit-log-partition-maintenance) lewat method event() — dua method
// standar Nest (log/error/warn/debug/verbose) HANYA best-effort membungkus
// log framework internal (route mapping, bootstrap, dst.) yang tidak
// menyediakan module/action eksplisit; event() adalah API yang sebenarnya
// dipakai kode aplikasi baru.
let AppLoggerService = class AppLoggerService {
    pino;
    constructor() {
        this.pino = (0, pino_1.default)({
            level: process.env.LOG_LEVEL ?? "info",
            base: { service: "qhse-api" },
            timestamp: pino_1.default.stdTimeFunctions.isoTime,
            formatters: {
                level(label) {
                    return { level: label };
                },
            },
        });
    }
    /** API utama — dipakai kode aplikasi (module/action eksplisit, TDD §15). */
    event(level, message, meta) {
        this.pino[level](this.withContext(meta), message);
    }
    withContext(meta) {
        return {
            tenant_id: (0, tenant_context_1.getCurrentTenantId)() ?? null,
            user_id: (0, tenant_context_1.getCurrentUserId)() ?? null,
            correlation_id: (0, request_context_1.getCurrentCorrelationId)() ?? null,
            ...meta,
        };
    }
    // ── NestJS LoggerService (app.useLogger) — log framework internal ──
    log(message, ...optionalParams) {
        this.fromNest("info", message, optionalParams);
    }
    error(message, ...optionalParams) {
        this.fromNest("error", message, optionalParams);
    }
    warn(message, ...optionalParams) {
        this.fromNest("warn", message, optionalParams);
    }
    debug(message, ...optionalParams) {
        this.fromNest("debug", message, optionalParams);
    }
    verbose(message, ...optionalParams) {
        this.fromNest("trace", message, optionalParams);
    }
    fromNest(level, message, optionalParams) {
        // Konvensi Nest: parameter terakhir string = "context" (nama kelas),
        // sisanya (mis. stack trace error) ikut disertakan apa adanya.
        const params = [...optionalParams];
        const context = typeof params[params.length - 1] === "string" ? params.pop() : undefined;
        this.pino[level](this.withContext({
            module: context ?? "nest",
            action: "framework_log",
            ...(params.length > 0 ? { nest_params: params } : {}),
        }), typeof message === "string" ? message : JSON.stringify(message));
    }
};
exports.AppLoggerService = AppLoggerService;
exports.AppLoggerService = AppLoggerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], AppLoggerService);
