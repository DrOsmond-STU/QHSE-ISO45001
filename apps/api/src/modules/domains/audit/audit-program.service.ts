import { Injectable } from "@nestjs/common";
import { AuditProgram, AuditProgramPlanItem, Prisma } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { requireActorUserId, requireTenantId } from "./audit-context";
import { AuditWorkflowBootstrapService } from "./audit-workflow-bootstrap.service";
import { validateAuditProgramStatusTransition } from "./audit-program-lifecycle";

// Lihat banner comment AuditWorkflowBootstrapService.ensureAuditProgramWorkflowDefinition.
const AUDIT_PROGRAM_WORKFLOW_ENTITY_TYPE = "audit_program";

export interface CreateAuditProgramPlanItemInput {
  plannedMonth: number;
  auditTypeId: string;
  siteId?: string;
  departmentId?: string;
  standardReference: string;
  plannedLeadAuditorId?: string;
}

export interface CreateAuditProgramInput {
  companyId: string;
  branchId?: string;
  programYear: number;
  name: string;
  objective?: string;
  planItems: CreateAuditProgramPlanItemInput[];
}

/**
 * Task 4.1 (Modul 09 §4 poin 1, §3 "Audit Program Owner/MR |
 * audit.program.create"). BELUM ada controller HTTP. audit_programs TIDAK
 * punya status bisnis "UNDER_REVIEW" terpisah (lihat banner comment
 * audit-program-lifecycle.ts) — submitForApproval() TIDAK mengubah status
 * (tetap DRAFT), hanya mengisi workflowInstanceId; AuditProgramWorkflowCompletionListener
 * (task 197) yang mengubah status jadi APPROVED saat workflow selesai.
 */
@Injectable()
export class AuditProgramService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bootstrapService: AuditWorkflowBootstrapService,
    private readonly workflowEngineService: WorkflowEngineService,
  ) {}

  async create(input: CreateAuditProgramInput): Promise<AuditProgram> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls(async (tx) => {
      const program = await tx.auditProgram.create({
        data: {
          tenantId,
          companyId: input.companyId,
          branchId: input.branchId,
          programYear: input.programYear,
          name: input.name,
          objective: input.objective,
          status: "DRAFT",
          createdBy,
          updatedBy: createdBy,
        },
      });
      await this.createPlanItems(tx, tenantId, program.id, input.planItems, createdBy);
      return program;
    });
  }

  async addPlanItem(auditProgramId: string, input: CreateAuditProgramPlanItemInput): Promise<AuditProgramPlanItem> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) =>
      tx.auditProgramPlanItem.create({
        data: {
          tenantId,
          auditProgramId,
          plannedMonth: input.plannedMonth,
          auditTypeId: input.auditTypeId,
          siteId: input.siteId,
          departmentId: input.departmentId,
          standardReference: input.standardReference,
          plannedLeadAuditorId: input.plannedLeadAuditorId,
          status: "PLANNED",
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );
  }

  private async createPlanItems(
    tx: Prisma.TransactionClient,
    tenantId: string,
    auditProgramId: string,
    planItems: CreateAuditProgramPlanItemInput[],
    createdBy: string,
  ): Promise<void> {
    if (planItems.length === 0) return;
    await tx.auditProgramPlanItem.createMany({
      data: planItems.map((item) => ({
        tenantId,
        auditProgramId,
        plannedMonth: item.plannedMonth,
        auditTypeId: item.auditTypeId,
        siteId: item.siteId,
        departmentId: item.departmentId,
        standardReference: item.standardReference,
        plannedLeadAuditorId: item.plannedLeadAuditorId,
        status: "PLANNED",
        createdBy,
        updatedBy: createdBy,
      })),
    });
  }

  async submitForApproval(auditProgramId: string): Promise<AuditProgram> {
    const actorId = requireActorUserId();

    const program = await this.prisma.withRls((tx) => tx.auditProgram.findUniqueOrThrow({ where: { id: auditProgramId } }));
    if (program.status !== "DRAFT") {
      throw new Error(`audit_programs tidak dapat disubmit — status saat ini ${program.status}, harus DRAFT.`);
    }
    if (program.workflowInstanceId) {
      throw new Error("audit_programs sudah punya workflow_instance aktif — tunggu hasil approval sebelum submit ulang.");
    }

    const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureAuditProgramWorkflowDefinition(tx));
    const instance = await this.workflowEngineService.startInstance(AUDIT_PROGRAM_WORKFLOW_ENTITY_TYPE, auditProgramId, definition.id, {});

    return this.prisma.withRls((tx) =>
      tx.auditProgram.update({ where: { id: auditProgramId }, data: { workflowInstanceId: instance.id, updatedBy: actorId } }),
    );
  }

  /**
   * Dipanggil AuditProgramWorkflowCompletionListener saat workflow APPROVED
   * — status->APPROVED. approvedBy SELALU NULL (WorkflowInstanceCompletedEvent
   * tidak punya field actor, re-query workflow_tasks dilarang, pola sama
   * EmergencyResponsePlan.markApprovedActive 3.7).
   */
  async markApprovedActive(auditProgramId: string): Promise<AuditProgram> {
    const program = await this.prisma.withRls((tx) => tx.auditProgram.findUniqueOrThrow({ where: { id: auditProgramId } }));
    validateAuditProgramStatusTransition(program.status, "APPROVED");
    return this.prisma.withRls((tx) =>
      tx.auditProgram.update({
        where: { id: auditProgramId },
        data: { status: "APPROVED", approvedAt: new Date() },
      }),
    );
  }

  /**
   * Dipanggil listener saat workflow REJECTED — status TETAP DRAFT (enum
   * tidak py nilai REJECTED, lihat banner comment audit-program-lifecycle.ts),
   * workflow_instance_id di-null-kan utk resubmission, pola sama JSA 3.2.
   */
  async returnToDraft(auditProgramId: string): Promise<AuditProgram> {
    return this.prisma.withRls((tx) =>
      tx.auditProgram.update({ where: { id: auditProgramId }, data: { workflowInstanceId: null } }),
    );
  }

  async cancel(auditProgramId: string): Promise<AuditProgram> {
    const updatedBy = requireActorUserId();
    const program = await this.prisma.withRls((tx) => tx.auditProgram.findUniqueOrThrow({ where: { id: auditProgramId } }));
    validateAuditProgramStatusTransition(program.status, "CANCELLED");
    return this.prisma.withRls((tx) =>
      tx.auditProgram.update({ where: { id: auditProgramId }, data: { status: "CANCELLED", updatedBy } }),
    );
  }

  async getById(auditProgramId: string) {
    return this.prisma.withRls((tx) =>
      tx.auditProgram.findUniqueOrThrow({ where: { id: auditProgramId }, include: { planItems: true } }),
    );
  }

  async listByCompany(companyId: string): Promise<AuditProgram[]> {
    return this.prisma.withRls((tx) =>
      tx.auditProgram.findMany({ where: { companyId, deletedAt: null }, orderBy: { programYear: "desc" } }),
    );
  }
}
