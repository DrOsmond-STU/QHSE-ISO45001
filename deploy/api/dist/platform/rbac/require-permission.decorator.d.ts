import { ScopeType } from "@prisma/client";
export declare const REQUIRE_PERMISSION_KEY = "requirePermission";
export interface RequirePermissionOptions {
    /** scopeType yang dicek — kalau di-set, scopeParam juga wajib diisi. */
    scopeType?: ScopeType;
    /** Nama param (req.params/body/query) berisi scopeId, mis. "siteId". */
    scopeParam?: string;
}
export interface RequirePermissionMetadata extends RequirePermissionOptions {
    code: string;
}
export declare const RequirePermission: (code: string, options?: RequirePermissionOptions) => import("@nestjs/common").CustomDecorator<string>;
