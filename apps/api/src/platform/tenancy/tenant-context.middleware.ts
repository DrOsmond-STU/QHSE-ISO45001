import { Injectable, NestMiddleware } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";
import { tenantContextStorage } from "./tenant-context";

// SEMENTARA (task 0.2): tenant_id diambil dari header `x-tenant-id` untuk
// keperluan verifikasi mekanisme RLS. Diganti ekstraksi dari JWT access token
// claim `tenant_id` (TDD §5.1, §8.1) begitu task 0.6 Autentikasi OIDC selesai
// — header mentah TIDAK boleh jadi sumber tenant_id di production (bisa
// dipalsukan client).
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const tenantId = req.header("x-tenant-id");
    if (!tenantId) {
      next();
      return;
    }
    tenantContextStorage.run({ tenantId }, () => next());
  }
}
