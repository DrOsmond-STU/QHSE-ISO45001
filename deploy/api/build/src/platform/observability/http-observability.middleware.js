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
exports.HttpObservabilityMiddleware = void 0;
const common_1 = require("@nestjs/common");
const app_logger_service_1 = require("./app-logger.service");
const metrics_service_1 = require("./metrics.service");
// TDD §15 — satu request line terstruktur + metrik Prometheus per request.
// Middleware (bukan interceptor) SENGAJA — interceptor NestJS hanya
// membungkus eksekusi route handler, jadi request yang ditolak guard
// (401/403, sebelum handler jalan) tidak akan pernah lewat interceptor;
// middleware jalan lebih awal (sebelum guard) dan res.on("finish") tetap
// menangkap status code akhir apa pun jalur yang menghasilkannya.
//
// Didaftarkan SETELAH CorrelationIdMiddleware (lihat observability.module.ts)
// supaya getCurrentCorrelationId() sudah terisi saat log ditulis.
let HttpObservabilityMiddleware = class HttpObservabilityMiddleware {
    logger;
    metrics;
    constructor(logger, metrics) {
        this.logger = logger;
        this.metrics = metrics;
    }
    use(req, res, next) {
        const startedAt = process.hrtime.bigint();
        res.on("finish", () => {
            const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
            // req.route hanya terisi SETELAH router menemukan match — pada titik
            // res.on("finish") ini, dispatch sudah selesai jadi sudah tersedia
            // (kalau match). 404 (tidak ada route cocok) fallback ke req.path.
            const route = req.route?.path ?? req.path;
            this.metrics.recordHttpRequest(req.method, route, res.statusCode, durationSeconds);
            this.logger.event("info", "http_request", {
                module: "http",
                action: `${req.method} ${route}`,
                http_method: req.method,
                http_route: route,
                http_status: res.statusCode,
                duration_ms: Math.round(durationSeconds * 1000),
            });
        });
        next();
    }
};
exports.HttpObservabilityMiddleware = HttpObservabilityMiddleware;
exports.HttpObservabilityMiddleware = HttpObservabilityMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [app_logger_service_1.AppLoggerService,
        metrics_service_1.MetricsService])
], HttpObservabilityMiddleware);
