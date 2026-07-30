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
@Module({
  imports: [EventEmitterModule.forRoot(), TenancyModule],
  providers: [ApproverResolutionService, WorkflowSlaScanService],
  exports: [WorkflowSlaScanService],
})
export class WorkflowEngineWorkerModule {}
