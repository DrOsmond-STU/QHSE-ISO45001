import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { AppLoggerService } from "./platform/observability/app-logger.service";
import { buildCorsOptions, TenantCorsResolverService } from "./platform/tenancy/tenant-cors-resolver.service";

async function bootstrap() {
  // bufferLogs:true — log yang terjadi SEBELUM useLogger() (mis. selama
  // resolusi DI module lain) ditampung dulu, di-flush begitu AppLoggerService
  // terpasang, bukan hilang/jatuh ke logger default Nest (TDD §15 — seluruh
  // log aplikasi WAJIB lewat Pino terstruktur, termasuk log bootstrap).
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(AppLoggerService));

  // Task 0.6 — refresh token httpOnly cookie (CSRF stance, lihat
  // platform/auth/auth.controller.ts).
  app.use(cookieParser());

  // Task 0.6 — DTO login/token butuh whitelist (TDD §16: tolak field yang
  // tidak dikenal, bukan cuma diabaikan diam-diam).
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  // credentials:true wajib supaya browser kirim cookie refresh token lintas
  // origin web(3000)<->api(3001) saat dev; origin dibatasi eksplisit (TDD
  // §16 — tidak wildcard "*" untuk endpoint berautentikasi). Task 1.6 —
  // origin callback ASYNC (cors package/Nest mendukungnya) supaya bisa
  // whitelist tenant_branding_configs.custom_domain, bukan cuma WEB_ORIGIN
  // statis — lihat TenantCorsResolverService utk alasan lengkap kenapa ini
  // butuh koneksi admin (RLS bypass) di level bootstrap.
  app.enableCors(buildCorsOptions(app.get(TenantCorsResolverService)));

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[qhse-api] listening on :${port}`);
}

bootstrap();
