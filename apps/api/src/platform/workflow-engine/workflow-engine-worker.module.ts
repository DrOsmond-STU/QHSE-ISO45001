import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { TenancyModule } from "../tenancy/tenancy.module";
import { ApproverResolutionService } from "./approver-resolution.service";
import { WorkflowSlaScanService } from "./workflow-sla-scan.service";

// Modul SLIM khusus proses worker (apps/worker) — TIDAK ada HTTP/guard/JWT,
// cuma yang genuinely dibutuhkan WorkflowSlaScanService. Ini yang di-boot
// lewat NestFactory.createApplicationContext() dari apps/worker (bukan
// module HTTP apps/api yang penuh) — reuse business logic yang SAMA persis
// tanpa duplikasi (lihat apps/worker/src/workflow-sla-scan.worker.ts).
//
// EventEmitterModule.forRoot() DI SINI supaya modul ini tetap self-sufficient
// saat di-boot berdiri sendiri oleh apps/worker (satu-satunya forRoot() di
// graph proses itu). WAJIB { maxListeners: 50 } SAMA PERSIS dgn app.module.ts
// (task 4.1 banner comment) — sejak task 6.4/shared-hosting, CronRunnerModule
// mengimpor modul ini JUGA ke proses apps/api (bukan cuma apps/worker), jadi
// forRoot() ini sekarang ikut ke-eval di graph YANG SAMA dgn punya AppModule.
// eventemitter2/@nestjs/event-emitter men-dedupe by TOKEN, bukan MERGE by
// value — options apa pun yang menang, harus 50 juga, atau maxListeners
// diam-diam turun balik ke default 10 dan logPossibleMemoryLeak() eventemitter2
// (bug proses.emitWarning() versi ini, lihat banner app.module.ts) crash
// SEMUA integration test yang boot AppModule penuh begitu listener workflow-
// completion ke-11 kedaftar — ditemukan EMPIRIS task 317 (7 suite gagal
// lintas 4 domain tidak terkait, semua TypeError sama).
@Module({
  imports: [EventEmitterModule.forRoot({ maxListeners: 50 }), TenancyModule],
  providers: [ApproverResolutionService, WorkflowSlaScanService],
  exports: [WorkflowSlaScanService],
})
export class WorkflowEngineWorkerModule {}
