import { INestApplication } from "@nestjs/common";
import { WorkflowEngineService } from "../../src/platform/workflow-engine/workflow-engine.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, createTestApp, seedSequentialWorkflowDefinition, seedTenantFixture } from "./test-helpers";

// TESTING §9 skenario 5 — "Idempotency: actOnTask dipanggil dua kali
// (double-submit) pada task yang sama -> hanya diproses sekali (row lock)."
// Row lock sungguhan (SELECT ... FOR UPDATE) tidak bisa disimulasikan lewat
// fake/mock — WAJIB integration test terhadap Postgres asli.
describe("WorkflowEngineService — idempotency double-submit", () => {
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

  it("dua actOnTask('APPROVE') konkuren pada task yang sama -> hanya SATU yang benar-benar memproses", async () => {
    const fixture = await seedTenantFixture();
    const wf = await seedSequentialWorkflowDefinition(fixture.tenantId);

    const instance = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
      service.startInstance("work_permit", "66666666-6666-6666-6666-666666666666", wf.workflowDefinitionId, {}),
    );
    const task = await adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId: instance.id, stageId: wf.stage1Id } });

    // Fire keduanya TANPA await yang pertama dulu — race sungguhan, bukan
    // sequential. Row lock (FOR UPDATE) yang wajib membuat panggilan kedua
    // blok sampai yang pertama commit.
    const [resultA, resultB] = await Promise.all([
      tenantContextStorage.run({ tenantId: fixture.tenantId }, () => service.actOnTask(task.id, "APPROVE", "submit 1", wf.approver1UserId)),
      tenantContextStorage.run({ tenantId: fixture.tenantId }, () => service.actOnTask(task.id, "APPROVE", "submit 2 (double-click)", wf.approver1UserId)),
    ]);

    const processedCount = [resultA, resultB].filter((r) => !r.alreadyProcessed).length;
    const alreadyProcessedCount = [resultA, resultB].filter((r) => r.alreadyProcessed).length;
    expect(processedCount).toBe(1);
    expect(alreadyProcessedCount).toBe(1);

    // Instance hanya maju SATU kali (ke stage 2), bukan ganda/rusak.
    const finalInstance = await adminPrisma.workflowInstance.findUniqueOrThrow({ where: { id: instance.id } });
    expect(finalInstance.currentStageId).toBe(wf.stage2Id);
    expect(finalInstance.status).toBe("IN_PROGRESS");

    const finalTask = await adminPrisma.workflowTask.findUniqueOrThrow({ where: { id: task.id } });
    expect(finalTask.status).toBe("APPROVED");
  });

  it("actOnTask pada task yang sudah APPROVED (dipanggil belakangan, tidak konkuren) -> alreadyProcessed:true, tidak throw", async () => {
    const fixture = await seedTenantFixture();
    const wf = await seedSequentialWorkflowDefinition(fixture.tenantId);

    const instance = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
      service.startInstance("work_permit", "77777777-7777-7777-7777-777777777777", wf.workflowDefinitionId, {}),
    );
    const task = await adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId: instance.id, stageId: wf.stage1Id } });

    await tenantContextStorage.run({ tenantId: fixture.tenantId }, () => service.actOnTask(task.id, "APPROVE", undefined, wf.approver1UserId));

    const secondAttempt = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
      service.actOnTask(task.id, "APPROVE", "klik lagi", wf.approver1UserId),
    );
    expect(secondAttempt.alreadyProcessed).toBe(true);
    expect(secondAttempt.task.status).toBe("APPROVED");
  });
});
