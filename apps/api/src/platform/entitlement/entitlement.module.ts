import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { TenancyModule } from "../tenancy/tenancy.module";
import { EntitlementCheckService } from "./entitlement-check.service";
import { EntitlementGuard } from "./entitlement.guard";

// Task 1.5 — BR-01. Diimpor SEBELUM RbacModule di app.module.ts (urutan
// import menentukan urutan eksekusi APP_GUARD, pola sama JwtAuthGuard
// sebelum PermissionGuard sejak 0.6/0.8) supaya EntitlementGuard jalan
// SEBELUM PermissionGuard.
@Module({
  imports: [TenancyModule],
  providers: [EntitlementCheckService, { provide: APP_GUARD, useClass: EntitlementGuard }],
  exports: [EntitlementCheckService],
})
export class EntitlementModule {}
