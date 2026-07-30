import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { AppLoggerService } from "./app-logger.service";
import { MetricsService } from "./metrics.service";

// TDD §15 — satu request line terstruktur + metrik Prometheus per request.
// Middleware (bukan interceptor) SENGAJA — interceptor NestJS hanya
// membungkus eksekusi route handler, jadi request yang ditolak guard
// (401/403, sebelum handler jalan) tidak akan pernah lewat interceptor;
// middleware jalan lebih awal (sebelum guard) dan res.on("finish") tetap
// menangkap status code akhir apa pun jalur yang menghasilkannya.
//
// Didaftarkan SETELAH CorrelationIdMiddleware (lihat observability.module.ts)
// supaya getCurrentCorrelationId() sudah terisi saat log ditulis.
@Injectable()
export class HttpObservabilityMiddleware implements NestMiddleware {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly metrics: MetricsService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startedAt = process.hrtime.bigint();

    res.on("finish", () => {
      const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
      // req.route hanya terisi SETELAH router menemukan match — pada titik
      // res.on("finish") ini, dispatch sudah selesai jadi sudah tersedia
      // (kalau match). 404 (tidak ada route cocok) fallback ke req.path.
      const route = (req.route?.path as string | undefined) ?? req.path;

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
}
