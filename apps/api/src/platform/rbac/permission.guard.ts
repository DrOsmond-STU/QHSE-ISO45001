import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { RequestUser } from "../auth/current-user.decorator";
import { PermissionService } from "./permission.service";
import { REQUIRE_PERMISSION_KEY, RequirePermissionMetadata } from "./require-permission.decorator";

// APP_GUARD kedua (didaftarkan RbacModule, setelah JwtAuthGuard di
// app.module.ts) — TIDAK fail-closed-by-default seperti JwtAuthGuard: route
// tanpa @RequirePermission() adalah no-op (lolos), supaya route yang sudah
// ada (mis. /auth/logout-all, self-service) tidak tiba-tiba butuh permission
// yang tidak relevan. Guard ini murni ADDITIVE untuk route yang eksplisit
// menandai diri.
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly permissionService: PermissionService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<RequirePermissionMetadata | undefined>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!metadata) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    const user = req.user;
    if (!user) {
      // JwtAuthGuard (APP_GUARD sebelumnya) seharusnya sudah menolak request
      // tanpa user sebelum guard ini jalan — kalau tetap sampai sini tanpa
      // user, fail closed juga (jangan asumsikan lolos).
      throw new ForbiddenException("Akses ditolak.");
    }

    const scopeContext =
      metadata.scopeType && metadata.scopeParam
        ? { scopeType: metadata.scopeType, scopeId: extractScopeId(req, metadata.scopeParam) }
        : undefined;

    const allowed = await this.permissionService.hasPermission(user.userId, user.tenantId, metadata.code, scopeContext);
    if (!allowed) {
      throw new ForbiddenException("Anda tidak memiliki permission untuk aksi ini.");
    }
    return true;
  }
}

function extractScopeId(req: Request, paramName: string): string {
  const value = req.params?.[paramName] ?? (req.body as Record<string, unknown>)?.[paramName] ?? req.query?.[paramName];
  return String(value ?? "");
}
