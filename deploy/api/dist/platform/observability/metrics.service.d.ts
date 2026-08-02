import { OnModuleDestroy } from "@nestjs/common";
import { Registry } from "prom-client";
export declare class MetricsService implements OnModuleDestroy {
    readonly registry: Registry<"text/plain; version=0.0.4; charset=utf-8">;
    private readonly httpRequestsTotal;
    private readonly httpRequestDuration;
    private readonly adminPrisma;
    private readonly queueConnection;
    private readonly queues;
    constructor();
    recordHttpRequest(method: string, route: string, status: number, durationSeconds: number): void;
    onModuleDestroy(): Promise<void>;
}
