import { SetMetadata } from "@nestjs/common";
import { ScopeType } from "@prisma/client";

export const REQUIRE_PERMISSION_KEY = "requirePermission";

export interface RequirePermissionOptions {
  /** scopeType yang dicek — kalau di-set, scopeParam juga wajib diisi. */
  scopeType?: ScopeType;
  /** Nama param (req.params/body/query) berisi scopeId, mis. "siteId". */
  scopeParam?: string;
}

export interface RequirePermissionMetadata extends RequirePermissionOptions {
  code: string;
}

// TDD §8.2 — @RequirePermission('work_permit.permit.approve') di level route.
// Tanpa decorator ini, PermissionGuard (APP_GUARD global) no-op — route
// otomatis lolos (tidak menambah proteksi, hanya route yang eksplisit
// menandai diri yang di-gate).
export const RequirePermission = (code: string, options: RequirePermissionOptions = {}) =>
  SetMetadata<string, RequirePermissionMetadata>(REQUIRE_PERMISSION_KEY, { code, ...options });
