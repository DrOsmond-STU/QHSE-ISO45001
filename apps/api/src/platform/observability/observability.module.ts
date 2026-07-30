import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { AppLoggerService } from "./app-logger.service";
import { CorrelationIdMiddleware } from "./correlation-id.middleware";
import { HttpObservabilityMiddleware } from "./http-observability.middleware";
import { MetricsController } from "./metrics.controller";
import { MetricsService } from "./metrics.service";

// Task 0.13 (TDD §15) — Pino terstruktur, correlation-id, metrics Prometheus
// dasar. CorrelationIdMiddleware WAJIB jalan sebelum HttpObservabilityMiddleware
// (urutan .apply() di bawah menentukan urutan eksekusi) supaya request log
// baris pertama pun sudah punya correlation_id.
@Module({
  controllers: [MetricsController],
  providers: [AppLoggerService, MetricsService],
  exports: [AppLoggerService, MetricsService],
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware, HttpObservabilityMiddleware).forRoutes("*");
  }
}
