import { INestApplication } from "@nestjs/common";
import { WorkflowEngineService } from "../../src/platform/workflow-engine/workflow-engine.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, createTestApp, seedParallelWorkflowDefinition, seedTenantFixture } from "./test-helpers";

// TESTING §9 skenario 3 — "Approval paralel: ALL_APPROVE vs ANY_ONE_APPROVE".
describe("WorkflowEngineService — approval paralel", () => {
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

  it("ALL_APPROVE: instance TETAP IN_PROGRESS sampai KEDUA approver approve", async () => {
    const fixture = await seedTenantFixture();
    const wf = await seedParallelWorkflowDefinition(fixture.tenantId, "ALL_APPROVE");
    const [userA, userB] = wf.approverUserIds;

    const instance = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
      service.startInstance("work_permit", "33333333-3333-3333-3333-333333333333", wf.workflowDefinitionId, {}),
    );

    const tasks = await adminPrisma.workflowTask.findMany({ where: { instanceId: instance.id, stageId: wf.stageId } });
    expect(tasks).toHaveLength(2);

    const taskA = tasks.find((t) => t.assignedTo === userA)!;
    const taskB = tasks.find((t) => t.assignedTo === userB)!;

    await tenantContextStorage.run({ tenantId: fixture.tenantId }, () => service.actOnTask(taskA.id, "APPROVE", undefined, userA));
    let current = await adminPrisma.workflowInstance.findUniqueOrThrow({ where: { id: instance.id } });
    expect(current.status).toBe("IN_PROGRESS"); // baru 1 dari 2 approve — belum selesai

    await tenantContextStorage.run({ tenantId: fixture.tenantId }, () => service.actOnTask(taskB.id, "APPROVE", undefined, userB));
    current = await adminPrisma.workflowInstance.findUniqueOrThrow({ where: { id: instance.id } });
    expect(current.status).toBe("APPROVED");
  });

  it("ANY_ONE_APPROVE: instance selesai APPROVED begitu SATU approver approve", async () => {
    const fixture = await seedTenantFixture();
    const wf = await seedParallelWorkflowDefinition(fixture.tenantId, "ANY_ONE_APPROVE");
    const [userA] = wf.approverUserIds;

    const instance = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
      service.startInstance("work_permit", "44444444-4444-4444-4444-444444444444", wf.workflowDefinitionId, {}),
    );

    const taskA = await adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId: instance.id, assignedTo: userA } });
    await tenantContextStorage.run({ tenantId: fixture.tenantId }, () => service.actOnTask(taskA.id, "APPROVE", undefined, userA));

    const current = await adminPrisma.workflowInstance.findUniqueOrThrow({ where: { id: instance.id } });
    expect(current.status).toBe("APPROVED");
  });

  it("satu REJECT menggagalkan instance TERLEPAS dari rule (ALL_APPROVE)", async () => {
    const fixture = await seedTenantFixture();
    const wf = await seedParallelWorkflowDefinition(fixture.tenantId, "ALL_APPROVE");
    const [userA, userB] = wf.approverUserIds;

    const instance = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
      service.startInstance("work_permit", "55555555-5555-5555-5555-555555555555", wf.workflowDefinitionId, {}),
    );

    const taskA = await adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId: instance.id, assignedTo: userA } });
    const taskB = await adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId: instance.id, assignedTo: userB } });

    await tenantContextStorage.run({ tenantId: fixture.tenantId }, () => service.actOnTask(taskA.id, "APPROVE", undefined, userA));
    await tenantContextStorage.run({ tenantId: fixture.tenantId }, () => service.actOnTask(taskB.id, "REJECT", "tidak setuju", userB));

    const current = await adminPrisma.workflowInstance.findUniqueOrThrow({ where: { id: instance.id } });
    expect(current.status).toBe("REJECTED");
  });
});
