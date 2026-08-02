"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CorrelationIdMiddleware = exports.CORRELATION_ID_HEADER = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const request_context_1 = require("./request-context");
exports.CORRELATION_ID_HEADER = "x-correlation-id";
// TDD §15 — "Header X-Correlation-Id di-generate di API Gateway jika belum
// ada, diteruskan lintas service call & job queue". Belum ada API Gateway
// sungguhan (DEPLOYMENT.md, layer itu Nginx/Cloud LB — task infra terpisah),
// jadi NestJS sendiri yang generate-if-missing supaya perilaku identik baik
// lewat gateway asli (Production) maupun akses langsung (dev lokal).
//
// Middleware ini SENGAJA tidak bergantung pada TenantContextMiddleware
// (tenancy/*) — murni baca/generate correlationId + ip/user-agent, supaya
// urutan pendaftaran middleware lintas modul tidak jadi concern (lihat
// observability.module.ts: didaftarkan forRoutes("*") independen).
let CorrelationIdMiddleware = class CorrelationIdMiddleware {
    use(req, res, next) {
        const incoming = req.header(exports.CORRELATION_ID_HEADER);
        const correlationId = incoming && incoming.trim().length > 0 ? incoming : (0, node_crypto_1.randomUUID)();
        res.setHeader("X-Correlation-Id", correlationId);
        request_context_1.observabilityContextStorage.run({
            correlationId,
            ipAddress: req.ip,
            userAgent: req.header("user-agent"),
        }, () => next());
    }
};
exports.CorrelationIdMiddleware = CorrelationIdMiddleware;
exports.CorrelationIdMiddleware = CorrelationIdMiddleware = __decorate([
    (0, common_1.Injectable)()
], CorrelationIdMiddleware);
