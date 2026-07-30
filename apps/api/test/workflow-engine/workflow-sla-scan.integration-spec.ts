import { INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { WorkflowEngineService } from "../../src/platform/workflow-engine/workflow-engine.service";
import { WorkflowSlaScanService } from "../../src/platform/workflow-engine/workflow-sla-scan.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, createTestApp, seedTenantFixture, seedUserInTenant } from "./test-helpers";

// TESTING §9 skenario 4 — "Eskalasi SLA: task melewati sla_hours -> job
// workflow-sla-scan memicu escalation_action yang benar." Panggil
// WorkflowSlaScanService.scan() LANGSUNG (bukan lewat BullMQ timer
// sungguhan) — konsisten dgn konvensi "no real external dependency di
// automated test" yang sudah ada di codebase ini.
describe("WorkflowSlaScanService — eskalasi SLA", () => {
  let app: INestApplication;
  let engineService: WorkflowEngineService;
  let scanService: WorkflowSlaScanService;

  beforeAll(async () => {
    app = await createTestApp();
    engineService = app.get(WorkflowEngineService);
    scanService = app.get(WorkflowSlaScanService);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  async function seedOverdueTaskWorkflow(
    tenantId: string,
    escalationAction: "NOTIFY_SUPERIOR" | "AUTO_ESCALATE" | "NONE",
    escalationRoleId: string | null,
  ) {
    const approverUserId = await seedUserInTenant(tenantId, "SLA Approver");
    const definition = await adminPrisma.workflowDefinition.create({
      data: { tenantId, moduleCode: "TEST_SLA", name: "SLA Test Workflow" },
    });
    const stage = await adminPrisma.workflowStage.create({
      data: {
        tenantId,
        workflowDefinitionId: definition.id,
        sequenceNo: 1,
        stageName: "SLA Stage",
        approverType: "SPECIFIC_USER",
        approverUserId,
        slaHours: 1,
        escalationAction,
        escalationRoleId,
      },
    });
    await adminPrisma.workflowTransition.create({
      data: {
        tenantId,
        workflowDefinitionId: definition.id,
        fromStageId: stage.id,
        toStageId: null,
        triggerAction: "APPROVE",
        resultStatus: "APPROVED",
      },
    });

    const instance = await tenantContextStorage.run({ tenantId }, () =>
      engineService.startInstance("work_permit", randomUUID(), definition.id, {}),
    );
    const task = await adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId: instance.id } });

    // Backdate createdAt supaya sudah lewat slaHours=1 (bukan lewat mock
    // waktu — manipulasi data langsung, real Postgres).
    const backdated = await adminPrisma.workflowTask.update({
      where: { id: task.id },
      data: { createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    });

    return { task: backdated, approverUserId };
  }

  it("NOTIFY_SUPERIOR: task overdue di-mark escalatedAt, TIDAK reassign", async () => {
    const fixture = await seedTenantFixture();
    const { task, approverUserId } = await seedOverdueTaskWorkflow(fixture.tenantId, "NOTIFY_SUPERIOR", null);

    await scanService.scan();

    const after = await adminPrisma.workflowTask.findUniqueOrThrow({ where: { id: task.id } });
    expect(after.escalatedAt).not.toBeNull();
    expect(after.assignedTo).toBe(approverUserId); // tidak reassign
  });

  it("AUTO_ESCALATE dengan escalationRoleId: task di-reassign ke pemegang role tsb", async () => {
    const fixture = await seedTenantFixture();
    const escalationHolderId = await seedUserInTenant(fixture.tenantId, "Escalation Holder");
    const escalationRole = await adminPrisma.role.create({
      data: { tenantId: fixture.tenantId, roleCode: `ESCALATION_${randomUUID().slice(0, 8)}`, name: "Escalation Role" },
    });
    await adminPrisma.userRole.create({
      data: { tenantId: fixture.tenantId, userId: escalationHolderId, roleId: escalationRole.id, scopeType: "TENANT", scopeId: null },
    });

    const { task, approverUserId } = await seedOverdueTaskWorkflow(fixture.tenantId, "AUTO_ESCALATE", escalationRole.id);

    await scanService.scan();

    const after = await adminPrisma.workflowTask.findUniqueOrThrow({ where: { id: task.id } });
    expect(after.escalatedAt).not.toBeNull();
    expect(after.assignedTo).toBe(escalationHolderId);
    expect(after.assignedTo).not.toBe(approverUserId);
  });

  it("task yang BELUM lewat SLA tidak ikut dieskalasi", async () => {
    const fixture = await seedTenantFixture();
    const approverUserId = await seedUserInTenant(fixture.tenantId, "Fresh Approver");
    const definition = await adminPrisma.workflowDefinition.create({
      data: { tenantId: fixture.tenantId, moduleCode: "TEST_SLA_FRESH", name: "Fresh SLA Workflow" },
    });
    const stage = await adminPrisma.workflowStage.create({
      data: {
        tenantId: fixture.tenantId,
        workflowDefinitionId: definition.id,
        sequenceNo: 1,
        stageName: "Fresh Stage",
        approverType: "SPECIFIC_USER",
        approverUserId,
        slaHours: 100, // jauh di masa depan
        escalationAction: "NOTIFY_SUPERIOR",
      },
    });
    await adminPrisma.workflowTransition.create({
      data: { tenantId: fixture.tenantId, workflowDefinitionId: definition.id, fromStageId: stage.id, toStageId: null, triggerAction: "APPROVE", resultStatus: "APPROVED" },
    });
    const instance = await tenantContextStorage.run({ tenantId: fixture.tenantId }, () =>
      engineService.startInstance("work_permit", randomUUID(), definition.id, {}),
    );
    const task = await adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId: instance.id } });

    await scanService.scan();

    const after = await adminPrisma.workflowTask.findUniqueOrThrow({ where: { id: task.id } });
    expect(after.escalatedAt).toBeNull();
  });

  it("idempotent: scan berulang TIDAK mengeskalasi ulang task yang sudah escalatedAt", async () => {
    const fixture = await seedTenantFixture();
    const { task } = await seedOverdueTaskWorkflow(fixture.tenantId, "NOTIFY_SUPERIOR", null);

    await scanService.scan();
    const afterFirst = await adminPrisma.workflowTask.findUniqueOrThrow({ where: { id: task.id } });
    const firstEscalatedAt = afterFirst.escalatedAt;
    expect(firstEscalatedAt).not.toBeNull();

    await scanService.scan();
    const afterSecond = await adminPrisma.workflowTask.findUniqueOrThrow({ where: { id: task.id } });
    expect(afterSecond.escalatedAt?.getTime()).toBe(firstEscalatedAt?.getTime());
  });
});
