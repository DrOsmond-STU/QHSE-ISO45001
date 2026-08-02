import { LoggerService } from "@nestjs/common";
export interface LogEventMeta {
    module: string;
    action: string;
    [key: string]: unknown;
}
export declare class AppLoggerService implements LoggerService {
    private readonly pino;
    constructor();
    /** API utama — dipakai kode aplikasi (module/action eksplisit, TDD §15). */
    event(level: "info" | "warn" | "error" | "debug", message: string, meta: LogEventMeta): void;
    private withContext;
    log(message: unknown, ...optionalParams: unknown[]): void;
    error(message: unknown, ...optionalParams: unknown[]): void;
    warn(message: unknown, ...optionalParams: unknown[]): void;
    debug(message: unknown, ...optionalParams: unknown[]): void;
    verbose(message: unknown, ...optionalParams: unknown[]): void;
    private fromNest;
}
