import { BadRequestException, Injectable } from "@nestjs/common";
import { WorkPermitExtension } from "@prisma/client";
import { ActOnTaskResult, WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./work-permit-context";
import { assertExtensionRequestAllowed } from "./work-permit-extension-rules";
import { validateWorkPermitStatusTransition } from "./work-permit-lifecycle";
import { assertRequesterNotApprover } from "./work-permit-segregation-of-duty";
import { WorkPermitWorkflowBootstrapService } from "./work-permit-workflow-bootstrap.service";

const WORK_PERMIT_EXTENSION_WORKFLOW_ENTITY_TYPE = "work_permit_extension";

export interface RequestWorkPermitExtensionInput {
  workPermitId: string;
  requestedNewEndDatetime: Date;
  reason: string;
  gasRetestRequired: boolean;
  requestedBy: string;
}

// Task 3.4 (Modul 06 §4 poin 8/§5/§6 BR-07). BELUM ada controller HTTP —
// work_permit.extension.* sudah di-seed RBAC baseline (task 142).
@Injectable()
export class WorkPermitExtensionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowEngineService: WorkflowEngineService,
    private readonly bootstrapService: WorkPermitWorkflowBootstrapService,
  ) {}

  /**
   * BR-07 (gate pengajuan) + PRD §4 poin 8. EMPAT transaksi TERPISAH,
   * alasan PERSIS HiraAssessmentService.submitForApproval() (3.2) —
   * gate check, create baris extension, ensure workflow definition +
   * startInstance, lalu commit workflowInstanceId + transisi
   * work_permits.status ACTIVE->EXTENSION_REQUESTED.
   */
  async request(input: RequestWorkPermitExtensionInput): Promise<WorkPermitExtension> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    await this.prisma.withRls(async (tx) => {
      const permit = await tx.workPermit.findUniqueOrThrow({ where: { id: input.workPermitId } });
      if (permit.status !== "ACTIVE") {
        throw new BadRequestException(`work_permits berstatus ${permit.status} tidak dapat mengajukan extension (wajib ACTIVE).`);
      }
      const type = await tx.workPermitType.findUniqueOrThrow({ where: { id: permit.workPermitTypeId }, select: { maxExtensionCount: true } });
      const existingCount = await tx.workPermitExtension.count({ where: { workPermitId: input.workPermitId } });
      assertExtensionRequestAllowed(new Date(), permit.plannedEndDatetime, existingCount, type.maxExtensionCount);
    });

    const extension = await this.prisma.withRls((tx) =>
      tx.workPermitExtension.create({
        data: {
          tenantId,
          workPermitId: input.workPermitId,
          requestedNewEndDatetime: input.requestedNewEndDatetime,
          reason: input.reason,
          gasRetestRequired: input.gasRetestRequired,
          status: "PENDING",
          requestedBy: input.requestedBy,
          requestedAt: new Date(),
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );

    const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureExtensionWorkflowDefinition(tx));
    const instance = await this.workflowEngineService.startInstance(WORK_PERMIT_EXTENSION_WORKFLOW_ENTITY_TYPE, extension.id, definition.id, {
      gasRetestRequired: input.gasRetestRequired,
    });

    return this.prisma.withRls(async (tx) => {
      await tx.workPermitExtension.update({ where: { id: extension.id }, data: { workflowInstanceId: instance.id } });
      const permit = await tx.workPermit.findUniqueOrThrow({ where: { id: input.workPermitId } });
      validateWorkPermitStatusTransition(permit.status, "EXTENSION_REQUESTED");
      await tx.workPermit.update({ where: { id: input.workPermitId }, data: { status: "EXTENSION_REQUESTED", updatedBy: createdBy } });
      return tx.workPermitExtension.findUniqueOrThrow({ where: { id: extension.id } });
    });
  }

  /**
   * BR-09 — wrapper WAJIB, pola PERSIS WorkPermitService.actOnApprovalTask()
   * (3.3, gap TDD §26 #111) — segregation of duty berlaku SAMA utk
   * approval extension (mengacu requester PERMIT INDUK, bukan extension
   * itu sendiri yang tidak py "requester" terpisah). Sekaligus mencatat
   * decided_by/decided_at "aktor TERAKHIR bertindak" pada SETIAP aksi
   * (bukan hanya final) — work_permit_extensions HANYA py SATU kolom
   * decided_by (beda dari work_permit_approvals cache yang pisah
   * issuer/hse), jadi utk workflow 2-stage kolom ini tertimpa aktor stage
   * kedua — dibaca sbg semantik paling masuk akal utk kolom tunggal.
   */
  async actOnExtensionTask(taskId: string, action: "APPROVE" | "REJECT", comment: string | undefined, actingUserId: string): Promise<ActOnTaskResult> {
    const task = await this.prisma.withRls((tx) => tx.workflowTask.findUniqueOrThrow({ where: { id: taskId } }));
    const instance = await this.prisma.withRls((tx) => tx.workflowInstance.findUniqueOrThrow({ where: { id: task.instanceId } }));

    if (instance.entityType === WORK_PERMIT_EXTENSION_WORKFLOW_ENTITY_TYPE) {
      const extension = await this.prisma.withRls((tx) => tx.workPermitExtension.findUniqueOrThrow({ where: { id: instance.entityId } }));
      const permit = await this.prisma.withRls((tx) =>
        tx.workPermit.findUniqueOrThrow({ where: { id: extension.workPermitId }, select: { requesterId: true } }),
      );
      assertRequesterNotApprover(permit.requesterId, actingUserId);
      await this.prisma.withRls((tx) =>
        tx.workPermitExtension.update({ where: { id: extension.id }, data: { decidedBy: actingUserId, decidedAt: new Date() } }),
      );
    }

    return this.workflowEngineService.actOnTask(taskId, action, comment, actingUserId);
  }

  async getById(extensionId: string): Promise<WorkPermitExtension> {
    return this.prisma.withRls((tx) => tx.workPermitExtension.findUniqueOrThrow({ where: { id: extensionId } }));
  }

  async listByPermit(workPermitId: string): Promise<WorkPermitExtension[]> {
    return this.prisma.withRls((tx) => tx.workPermitExtension.findMany({ where: { workPermitId }, orderBy: { requestedAt: "desc" } }));
  }
}
