import { Module } from "@nestjs/common";
import { TenancyModule } from "../tenancy/tenancy.module";
import { ApproverResolutionService } from "./approver-resolution.service";
import { WorkflowEngineService } from "./workflow-engine.service";
import { WorkflowSlaQueueService } from "./workflow-sla-queue.service";
import { WorkflowSlaScanService } from "./workflow-sla-scan.service";

@Module({
  imports: [TenancyModule],
  providers: [ApproverResolutionService, WorkflowEngineService, WorkflowSlaScanService, WorkflowSlaQueueService],
  exports: [WorkflowEngineService],
})
export class WorkflowEngineModule {}
