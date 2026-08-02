import { AsyncLocalStorage } from "node:async_hooks";
export interface ObservabilityContextStore {
    correlationId: string;
    ipAddress?: string;
    userAgent?: string;
}
export declare const observabilityContextStorage: AsyncLocalStorage<ObservabilityContextStore>;
export declare function getCurrentCorrelationId(): string | undefined;
export declare function getCurrentIpAddress(): string | undefined;
export declare function getCurrentUserAgent(): string | undefined;
