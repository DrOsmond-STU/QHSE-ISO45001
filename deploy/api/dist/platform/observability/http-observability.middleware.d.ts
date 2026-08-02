import { NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { AppLoggerService } from "./app-logger.service";
import { MetricsService } from "./metrics.service";
export declare class HttpObservabilityMiddleware implements NestMiddleware {
    private readonly logger;
    private readonly metrics;
    constructor(logger: AppLoggerService, metrics: MetricsService);
    use(req: Request, res: Response, next: NextFunction): void;
}
