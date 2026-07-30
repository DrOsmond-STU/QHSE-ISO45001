import { ScopeType, WorkflowParallelCompletionRule } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { adminPrisma } from "../auth/test-helpers";

export { adminPrisma, createTestApp, finishTestApp, testingModuleBuilder, seedTenantFixture } from "../auth/test-helpers";
export type { TenantFixture } from "../auth/test-helpers";

export async function seedUserInTenant(tenantId: string, label = "Test User"): Promise<string> {
  const user = await adminPrisma.user.create({
    data: { tenantId, email: `${label.toLowerCase().replace(/\s+/g, "-")}-${randomUUID()}@qhse.local`, fullName: label, status: "ACTIVE" },
  });
  return user.id;
}

export interface SequentialWorkflowFixture {
  workflowDefinitionId: string;
  stage1Id: string;
  stage2Id: string;
  approver1UserId: string;
  approver2UserId: string;
}

/**
 * 2 stage sequential: stage1 APPROVE -> stage2, stage1 REJECT -> terminal
 * REJECTED, stage2 APPROVE -> terminal APPROVED. Masing-masing stage
 * SPECIFIC_USER (1 approver), tidak paralel.
 */
export async function seedSequentialWorkflowDefinition(tenantId: string): Promise<SequentialWorkflowFixture> {
  const approver1UserId = await seedUserInTenant(tenantId, "Approver Stage 1");
  const approver2UserId = await seedUserInTenant(tenantId, "Approver Stage 2");

  const definition = await adminPrisma.workflowDefinition.create({
    data: { tenantId, moduleCode: "TEST_SEQUENTIAL", name: "Sequential Test Workflow" },
  });

  const stage1 = await adminPrisma.workflowStage.create({
    data: {
      tenantId,
      workflowDefinitionId: definition.id,
      sequenceNo: 1,
      stageName: "Stage 1",
      approverType: "SPECIFIC_USER",
      approverUserId: approver1UserId,
      slaHours: 24,
      escalationAction: "NONE",
    },
  });
  const stage2 = await adminPrisma.workflowStage.create({
    data: {
      tenantId,
      workflowDefinitionId: definition.id,
      sequenceNo: 2,
      stageName: "Stage 2",
      approverType: "SPECIFIC_USER",
      approverUserId: approver2UserId,
      slaHours: 24,
      escalationAction: "NONE",
    },
  });

  await adminPrisma.workflowTransition.createMany({
    data: [
      {
        tenantId,
        workflowDefinitionId: definition.id,
        fromStageId: stage1.id,
        toStageId: stage2.id,
        triggerAction: "APPROVE",
        condition: undefined,
        priority: 0,
      },
      {
        tenantId,
        workflowDefinitionId: definition.id,
        fromStageId: stage1.id,
        toStageId: null,
        triggerAction: "REJECT",
        condition: undefined,
        priority: 0,
        resultStatus: "REJECTED",
      },
      {
        tenantId,
        workflowDefinitionId: definition.id,
        fromStageId: stage2.id,
        toStageId: null,
        triggerAction: "APPROVE",
        condition: undefined,
        priority: 0,
        resultStatus: "APPROVED",
      },
    ],
  });

  return { workflowDefinitionId: definition.id, stage1Id: stage1.id, stage2Id: stage2.id, approver1UserId, approver2UserId };
}

export interface ParallelWorkflowFixture {
  workflowDefinitionId: string;
  stageId: string;
  approverUserIds: string[];
}

/** 1 stage paralel, 2 approver (ROLE_IN_SCOPE, role custom dgn 2 user). */
export async function seedParallelWorkflowDefinition(
  tenantId: string,
  rule: WorkflowParallelCompletionRule,
): Promise<ParallelWorkflowFixture> {
  const userA = await seedUserInTenant(tenantId, "Parallel Approver A");
  const userB = await seedUserInTenant(tenantId, "Parallel Approver B");

  const role = await adminPrisma.role.create({
    data: { tenantId, roleCode: `PARALLEL_APPROVER_${randomUUID().slice(0, 8)}`, name: "Parallel Approver" },
  });
  await adminPrisma.userRole.createMany({
    data: [
      { tenantId, userId: userA, roleId: role.id, scopeType: "TENANT" as ScopeType, scopeId: null },
      { tenantId, userId: userB, roleId: role.id, scopeType: "TENANT" as ScopeType, scopeId: null },
    ],
  });

  const definition = await adminPrisma.workflowDefinition.create({
    data: { tenantId, moduleCode: "TEST_PARALLEL", name: "Parallel Test Workflow" },
  });

  const stage = await adminPrisma.workflowStage.create({
    data: {
      tenantId,
      workflowDefinitionId: definition.id,
      sequenceNo: 1,
      stageName: "Parallel Stage",
      approverType: "ROLE_IN_SCOPE",
      approverRoleId: role.id,
      slaHours: 24,
      escalationAction: "NONE",
      isParallelGroup: true,
      parallelCompletionRule: rule,
    },
  });

  await adminPrisma.workflowTransition.createMany({
    data: [
      {
        tenantId,
        workflowDefinitionId: definition.id,
        fromStageId: stage.id,
        toStageId: null,
        triggerAction: "APPROVE",
        condition: undefined,
        priority: 0,
        resultStatus: "APPROVED",
      },
      {
        tenantId,
        workflowDefinitionId: definition.id,
        fromStageId: stage.id,
        toStageId: null,
        triggerAction: "REJECT",
        condition: undefined,
        priority: 0,
        resultStatus: "REJECTED",
      },
    ],
  });

  return { workflowDefinitionId: definition.id, stageId: stage.id, approverUserIds: [userA, userB] };
}
