import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { observabilityContextStorage } from "./request-context";

export const CORRELATION_ID_HEADER = "x-correlation-id";

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
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.header(CORRELATION_ID_HEADER);
    const correlationId = incoming && incoming.trim().length > 0 ? incoming : randomUUID();

    res.setHeader("X-Correlation-Id", correlationId);

    observabilityContextStorage.run(
      {
        correlationId,
        ipAddress: req.ip,
        userAgent: req.header("user-agent"),
      },
      () => next(),
    );
  }
}
