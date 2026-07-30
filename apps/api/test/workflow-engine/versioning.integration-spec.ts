import { INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { WorkflowEngineService } from "../../src/platform/workflow-engine/workflow-engine.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, createTestApp, seedSequentialWorkflowDefinition, seedTenantFixture, seedUserInTenant } from "./test-helpers";

// TESTING §9 skenario 6 — "Versioning: instance yang sedang berjalan tetap
// memakai versi workflow_definitions LAMA meski definisi diubah/dipublikasi
// ulang di tengah jalan." (Master PRD §9.2). WorkflowEngineService TIDAK
// PERNAH "resolve definisi aktif tenant" — instance selalu mengikuti FK
// chain (currentStageId -> stage -> workflow_definition_id) yang di-pin
// sejak startInstance(). Publikasi versi baru = baris WorkflowDefinition
// BARU (moduleCode sama, version+1), bukan mutasi baris lama.
describe("WorkflowEngineService — versioning definisi", () => {
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

  it("instance yang sudah start di v1 tetap ikut alur v1 walau v2 dipublikasi dgn alur BEDA", async () => {
    const fixture = await seedTenantFixture();
    const v1 = await seedSequentialWorkflowDefinition(fixture.tenantId);

    // Instance dimulai di v1 SEBELUM v2 ada.
    const instance = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
      service.startInstance("work_permit", randomUUID(), v1.workflowDefinitionId, {}),
    );

    // "Publikasi v2" — moduleCode SAMA, version berbeda, alur SENGAJA beda
    // (stage1 approve -> LANGSUNG terminal APPROVED, bukan lanjut stage2).
    const approverV2 = await seedUserInTenant(fixture.tenantId, "V2 Approver");
    const v2Definition = await adminPrisma.workflowDefinition.create({
      data: { tenantId: fixture.tenantId, moduleCode: "TEST_SEQUENTIAL", name: "Sequential Test Workflow", version: 2 },
    });
    const v2Stage1 = await adminPrisma.workflowStage.create({
      data: {
        tenantId: fixture.tenantId,
        workflowDefinitionId: v2Definition.id,
        sequenceNo: 1,
        stageName: "V2 Stage 1 (single-stage flow)",
        approverType: "SPECIFIC_USER",
        approverUserId: approverV2,
        slaHours: 24,
        escalationAction: "NONE",
      },
    });
    await adminPrisma.workflowTransition.create({
      data: {
        tenantId: fixture.tenantId,
        workflowDefinitionId: v2Definition.id,
        fromStageId: v2Stage1.id,
        toStageId: null,
        triggerAction: "APPROVE",
        resultStatus: "APPROVED",
      },
    });

    // actOnTask di instance v1 (yang sudah berjalan) — kalau engine SALAH
    // "melompat" ke definisi terbaru, instance akan langsung APPROVED
    // (mengikuti alur v2). Yang BENAR: tetap lanjut ke stage2 versi v1.
    const stage1Task = await adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId: instance.id, stageId: v1.stage1Id } });
    await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
      service.actOnTask(stage1Task.id, "APPROVE", undefined, v1.approver1UserId),
    );

    const afterStage1 = await adminPrisma.workflowInstance.findUniqueOrThrow({ where: { id: instance.id } });
    expect(afterStage1.status).toBe("IN_PROGRESS"); // BUKAN APPROVED — masih ikut v1
    expect(afterStage1.currentStageId).toBe(v1.stage2Id); // maju ke stage2 v1, bukan terminal v2
    expect(afterStage1.workflowDefinitionId).toBe(v1.workflowDefinitionId); // tidak pernah pindah ke v2Definition.id

    // Instance BARU yang start setelah v2 ada, kalau eksplisit menunjuk v1,
    // tetap dapat alur v1 (workflowDefinitionId eksplisit, bukan "terbaru").
    const anotherV1Instance = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
      service.startInstance("work_permit", randomUUID(), v1.workflowDefinitionId, {}),
    );
    expect(anotherV1Instance.workflowDefinitionId).toBe(v1.workflowDefinitionId);
  });
});
