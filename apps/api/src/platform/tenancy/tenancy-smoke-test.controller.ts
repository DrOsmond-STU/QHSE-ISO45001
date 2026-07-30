import { Controller, Get } from "@nestjs/common";
import { Public } from "../auth/public.decorator";
import { PrismaService } from "./prisma.service";

// Bukti mekanisme RLS + tenant context berjalan end-to-end (task 0.2),
// dari HTTP request -> AsyncLocalStorage -> SET LOCAL -> query terfilter.
// Dihapus/diganti begitu modul domain sungguhan (Modul 01 dst., Phase 1)
// tersedia dan bisa jadi bukti yang sama secara alami.
//
// Public (task 0.6, JwtAuthGuard global) — TAPI sejak middleware tenant
// context tidak lagi percaya header x-tenant-id mentah (diganti ekstraksi
// JWT, lihat tenant-context.middleware.ts), endpoint ini praktis selalu
// mengembalikan 0 baris tanpa Bearer token valid. Diterima: controller ini
// murni smoke-test task 0.2/0.3, dihapus begitu modul domain Phase 1 ada
// (lihat komentar di atas) — memberi jalur x-tenant-id lagi ke sini di luar
// scope task 0.6.
@Controller("platform/tenancy-smoke-test")
export class TenancySmokeTestController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    const rows = await this.prisma.withRls((tx) => tx.rlsSmokeTest.findMany());
    return { data: rows, meta: { count: rows.length } };
  }
}
