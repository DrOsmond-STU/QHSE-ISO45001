"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservabilityModule = void 0;
const common_1 = require("@nestjs/common");
const app_logger_service_1 = require("./app-logger.service");
const correlation_id_middleware_1 = require("./correlation-id.middleware");
const http_observability_middleware_1 = require("./http-observability.middleware");
const metrics_controller_1 = require("./metrics.controller");
const metrics_service_1 = require("./metrics.service");
// Task 0.13 (TDD §15) — Pino terstruktur, correlation-id, metrics Prometheus
// dasar. CorrelationIdMiddleware WAJIB jalan sebelum HttpObservabilityMiddleware
// (urutan .apply() di bawah menentukan urutan eksekusi) supaya request log
// baris pertama pun sudah punya correlation_id.
let ObservabilityModule = class ObservabilityModule {
    configure(consumer) {
        consumer.apply(correlation_id_middleware_1.CorrelationIdMiddleware, http_observability_middleware_1.HttpObservabilityMiddleware).forRoutes("*");
    }
};
exports.ObservabilityModule = ObservabilityModule;
exports.ObservabilityModule = ObservabilityModule = __decorate([
    (0, common_1.Module)({
        controllers: [metrics_controller_1.MetricsController],
        providers: [app_logger_service_1.AppLoggerService, metrics_service_1.MetricsService],
        exports: [app_logger_service_1.AppLoggerService, metrics_service_1.MetricsService],
    })
], ObservabilityModule);
