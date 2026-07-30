import { Injectable, LoggerService } from "@nestjs/common";
import pino, { Logger as PinoLogger } from "pino";
import { getCurrentTenantId, getCurrentUserId } from "../tenancy/tenant-context";
import { getCurrentCorrelationId } from "./request-context";

export interface LogEventMeta {
  module: string;
  action: string;
  [key: string]: unknown;
}

// TDD §15 — "Structured JSON log (Pino), setiap log wajib menyertakan
// tenant_id, user_id, correlation_id, module, action". Field 5 itu diinjeksi
// OTOMATIS dari AsyncLocalStorage (tenancy/tenant-context.ts +
// observability/request-context.ts) — pemanggil TIDAK PERNAH perlu
// meneruskannya manual, sama prinsipnya dengan tenantId di PrismaService.
//
// Dipasang sebagai logger global Nest via app.useLogger() (main.ts) SEKALIGUS
// diinject langsung ke service manapun yang butuh log bisnis terstruktur
// (mis. audit-log-partition-maintenance) lewat method event() — dua method
// standar Nest (log/error/warn/debug/verbose) HANYA best-effort membungkus
// log framework internal (route mapping, bootstrap, dst.) yang tidak
// menyediakan module/action eksplisit; event() adalah API yang sebenarnya
// dipakai kode aplikasi baru.
@Injectable()
export class AppLoggerService implements LoggerService {
  private readonly pino: PinoLogger;

  constructor() {
    this.pino = pino({
      level: process.env.LOG_LEVEL ?? "info",
      base: { service: "qhse-api" },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level(label) {
          return { level: label };
        },
      },
    });
  }

  /** API utama — dipakai kode aplikasi (module/action eksplisit, TDD §15). */
  event(level: "info" | "warn" | "error" | "debug", message: string, meta: LogEventMeta): void {
    this.pino[level](this.withContext(meta), message);
  }

  private withContext(meta: Record<string, unknown>) {
    return {
      tenant_id: getCurrentTenantId() ?? null,
      user_id: getCurrentUserId() ?? null,
      correlation_id: getCurrentCorrelationId() ?? null,
      ...meta,
    };
  }

  // ── NestJS LoggerService (app.useLogger) — log framework internal ──
  log(message: unknown, ...optionalParams: unknown[]): void {
    this.fromNest("info", message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.fromNest("error", message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.fromNest("warn", message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.fromNest("debug", message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.fromNest("trace", message, optionalParams);
  }

  private fromNest(level: "info" | "error" | "warn" | "debug" | "trace", message: unknown, optionalParams: unknown[]): void {
    // Konvensi Nest: parameter terakhir string = "context" (nama kelas),
    // sisanya (mis. stack trace error) ikut disertakan apa adanya.
    const params = [...optionalParams];
    const context = typeof params[params.length - 1] === "string" ? (params.pop() as string) : undefined;
    this.pino[level](
      this.withContext({
        module: context ?? "nest",
        action: "framework_log",
        ...(params.length > 0 ? { nest_params: params } : {}),
      }),
      typeof message === "string" ? message : JSON.stringify(message),
    );
  }
}
