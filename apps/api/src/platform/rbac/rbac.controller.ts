import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../tenancy/prisma.service";
import { RequirePermission } from "./require-permission.decorator";

// Proof-of-concept @RequirePermission (task 0.8) — permission_code ini
// PERSIS sesuai Modul 02 §3 (baris Super Admin Platform):
// "user_mgmt.permission.manage (katalog global)". Bukan endpoint admin
// sungguhan (Modul 02/task 1.3 yang membangun itu) — cuma membuktikan guard
// + PermissionService bekerja end-to-end terhadap tabel permissions global.
@Controller("rbac")
export class RbacController {
  constructor(private readonly prisma: PrismaService) {}

  @RequirePermission("user_mgmt.permission.manage")
  @Get("permissions")
  async listPermissions() {
    const rows = await this.prisma.withRls((tx) =>
      tx.permission.findMany({ where: { isActive: true }, orderBy: { permissionCode: "asc" } }),
    );
    return { data: rows };
  }
}
