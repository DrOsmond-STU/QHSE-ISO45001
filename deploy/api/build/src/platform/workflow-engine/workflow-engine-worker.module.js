"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowEngineWorkerModule = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const tenancy_module_1 = require("../tenancy/tenancy.module");
const approver_resolution_service_1 = require("./approver-resolution.service");
const workflow_sla_scan_service_1 = require("./workflow-sla-scan.service");
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
let WorkflowEngineWorkerModule = class WorkflowEngineWorkerModule {
};
exports.WorkflowEngineWorkerModule = WorkflowEngineWorkerModule;
exports.WorkflowEngineWorkerModule = WorkflowEngineWorkerModule = __decorate([
    (0, common_1.Module)({
        imports: [event_emitter_1.EventEmitterModule.forRoot({ maxListeners: 50 }), tenancy_module_1.TenancyModule],
        providers: [approver_resolution_service_1.ApproverResolutionService, workflow_sla_scan_service_1.WorkflowSlaScanService],
        exports: [workflow_sla_scan_service_1.WorkflowSlaScanService],
    })
], WorkflowEngineWorkerModule);
