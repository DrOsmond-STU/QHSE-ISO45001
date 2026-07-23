import { Module } from "@nestjs/common";
import { HealthModule } from "./platform/health/health.module";

// Modul platform (auth, rbac, workflow-engine, numbering, notification,
// attachment, audit-log) ditambahkan satu per satu sesuai
// TASK_INSTRUCTION.md Phase 0 (task 0.6 dst.), dan modul domain
// (src/modules/domains/<module>) mulai Phase 1 — bukan di sini dulu.
@Module({
  imports: [HealthModule],
})
export class AppModule {}
