import { Controller, Get } from "@nestjs/common";
import { Public } from "../auth/public.decorator";

// DEPLOYMENT.md §11 — smoke test pasca-deploy wajib cek endpoint /health.
// Task 0.2 akan menambah pengecekan koneksi Postgres/Redis nyata di sini
// (bukan hanya 200 statis) begitu database tersedia di environment build.
@Controller("health")
export class HealthController {
  // Public — health check dipakai load balancer/orchestrator sebelum ada
  // sesi apa pun (task 0.6, JwtAuthGuard global).
  @Public()
  @Get()
  check() {
    return {
      status: "ok",
      service: "qhse-api",
      timestamp: new Date().toISOString(),
    };
  }
}
