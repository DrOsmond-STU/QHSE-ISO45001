import { INestApplication } from "@nestjs/common";
import { WorkflowEngineService } from "../../src/platform/workflow-engine/workflow-engine.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, createTestApp, seedSequentialWorkflowDefinition, seedTenantFixture } from "./test-helpers";

// TESTING §9 skenario 1 — "Transisi sekuensial dasar (approve -> lanjut
// stage, reject -> berhenti)".
describe("WorkflowEngineService — transisi sekuensial", () => {
  let app: INestApplication;
  let service: WorkflowEngineService;

  beforeAll(async () => {
    app = await createTestApp();
    service = app.get(WorkflowEngineService);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  it("approve di stage 1 -> lanjut ke stage 2; approve di stage 2 -> instance APPROVED", async () => {
    const fixture = await seedTenantFixture();
    const wf = await seedSequentialWorkflowDefinition(fixture.tenantId);

    const instance = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
      service.startInstance("work_permit", "11111111-1111-1111-1111-111111111111", wf.workflowDefinitionId, {}),
    );
    expect(instance.status).toBe("IN_PROGRESS");
    expect(instance.currentStageId).toBe(wf.stage1Id);

    const afterStage1 = await tenantContextStorage.run({ tenantId: fixture.tenantId }, async () => {
      const task = await adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId: instance.id, stageId: wf.stage1Id } });
      return service.actOnTask(task.id, "APPROVE", "lgtm", wf.approver1UserId);
    });
    expect(afterStage1.alreadyProcessed).toBe(false);

    const instanceAfterStage1 = await adminPrisma.workflowInstance.findUniqueOrThrow({ where: { id: instance.id } });
    expect(instanceAfterStage1.status).toBe("IN_PROGRESS");
    expect(instanceAfterStage1.currentStageId).toBe(wf.stage2Id);

    await tenantContextStorage.run({ tenantId: fixture.tenantId }, async () => {
      const task2 = await adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId: instance.id, stageId: wf.stage2Id } });
      return service.actOnTask(task2.id, "APPROVE", undefined, wf.approver2UserId);
    });

    const finalInstance = await adminPrisma.workflowInstance.findUniqueOrThrow({ where: { id: instance.id } });
    expect(finalInstance.status).toBe("APPROVED");
    expect(finalInstance.currentStageId).toBeNull();
    expect(finalInstance.completedAt).not.toBeNull();
  });

  it("reject di stage 1 -> instance langsung REJECTED, tidak lanjut ke stage 2", async () => {
    const fixture = await seedTenantFixture();
    const wf = await seedSequentialWorkflowDefinition(fixture.tenantId);

    const instance = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
      service.startInstance("work_permit", "22222222-2222-2222-2222-222222222222", wf.workflowDefinitionId, {}),
    );

    await tenantContextStorage.run({ tenantId: fixture.tenantId }, async () => {
      const task = await adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId: instance.id, stageId: wf.stage1Id } });
      return service.actOnTask(task.id, "REJECT", "tidak layak", wf.approver1UserId);
    });

    const finalInstance = await adminPrisma.workflowInstance.findUniqueOrThrow({ where: { id: instance.id } });
    expect(finalInstance.status).toBe("REJECTED");
    expect(finalInstance.currentStageId).toBeNull();

    // Tidak ada task apa pun dibuat untuk stage 2.
    const stage2Tasks = await adminPrisma.workflowTask.findMany({ where: { instanceId: instance.id, stageId: wf.stage2Id } });
    expect(stage2Tasks).toHaveLength(0);
  });
});
