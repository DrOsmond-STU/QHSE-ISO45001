import { Controller, Get, Res } from "@nestjs/common";
import type { Response } from "express";
import { Public } from "../auth/public.decorator";
import { MetricsService } from "./metrics.service";

// TDD §15 — endpoint scrape Prometheus. Public (pola sama /health) karena
// scraper (Prometheus server) tidak punya sesi user; pembatasan akses
// jaringan endpoint ini adalah tanggung jawab layer infra (network
// policy/ingress), bukan aplikasi (DEPLOYMENT.md §11 dashboard operasional).
@Controller("metrics")
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Public()
  @Get()
  async getMetrics(@Res() res: Response): Promise<void> {
    res.setHeader("Content-Type", this.metricsService.registry.contentType);
    res.send(await this.metricsService.registry.metrics());
  }
}
