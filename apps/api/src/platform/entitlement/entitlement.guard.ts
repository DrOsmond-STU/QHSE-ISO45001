import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { RequestUser } from "../auth/current-user.decorator";
import { REQUIRE_PERMISSION_KEY, RequirePermissionMetadata } from "../rbac/require-permission.decorator";
import { EntitlementCheckService } from "./entitlement-check.service";

// Task 1.5 — BR-01 (Modul 31 §6). APP_GUARD KETIGA (didaftarkan
// SystemAdministrationModule, diimpor SEBELUM RbacModule di app.module.ts
// supaya jalan LEBIH DULU dari PermissionGuard — "blokir modul secara
// PENUH" lebih fundamental daripada cek permission granular, dan
// menghindari resolusi scope RBAC yang tidak perlu utk modul yang memang
// tidak aktif). Reuse metadata @RequirePermission() (BUKAN decorator baru
// @RequireModule()) — permission_code SUDAH membawa module_code lewat
// Permission.moduleCode (lihat EntitlementCheckService.resolveModuleCodeForPermission()),
// jadi route yang sudah @RequirePermission() OTOMATIS ikut ter-gate modul
// tanpa perlu menandai diri dua kali. Route TANPA @RequirePermission()
// no-op (lolos) — pola PERSIS PermissionGuard (0.8).
@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(
    private readonly entitlementCheckService: EntitlementCheckService,
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
      // JwtAuthGuard (APP_GUARD pertama) seharusnya sudah menolak sebelum
      // sampai sini — fail closed juga kalau tetap terjadi.
      throw new ForbiddenException("Akses ditolak.");
    }

    const moduleCode = await this.entitlementCheckService.resolveModuleCodeForPermission(metadata.code);
    if (!moduleCode) {
      // permission_code tidak dikenal katalog — bukan tanggung jawab guard
      // ini (PermissionGuard/hasPermission() yang akan menolaknya).
      return true;
    }

    const allowed = await this.entitlementCheckService.isModuleEnabledForTenant(user.tenantId, moduleCode);
    if (!allowed) {
      throw new ForbiddenException(`Modul "${moduleCode}" tidak aktif untuk tenant Anda.`);
    }
    return true;
  }
}
