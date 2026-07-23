import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

// Bukti mekanisme RLS + tenant context berjalan end-to-end (task 0.2),
// dari HTTP request -> AsyncLocalStorage -> SET LOCAL -> query terfilter.
// Dihapus/diganti begitu modul domain sungguhan (Modul 01 dst., Phase 1)
// tersedia dan bisa jadi bukti yang sama secara alami.
@Controller("platform/tenancy-smoke-test")
export class TenancySmokeTestController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    const rows = await this.prisma.withRls((tx) => tx.rlsSmokeTest.findMany());
    return { data: rows, meta: { count: rows.length } };
  }
}
