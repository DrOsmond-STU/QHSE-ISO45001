import { Controller, Get } from "@nestjs/common";

// DEPLOYMENT.md §11 — smoke test pasca-deploy wajib cek endpoint /health.
// Task 0.2 akan menambah pengecekan koneksi Postgres/Redis nyata di sini
// (bukan hanya 200 statis) begitu database tersedia di environment build.
@Controller("health")
export class HealthController {
  @Get()
  check() {
    return {
      status: "ok",
      service: "qhse-api",
      timestamp: new Date().toISOString(),
    };
  }
}
