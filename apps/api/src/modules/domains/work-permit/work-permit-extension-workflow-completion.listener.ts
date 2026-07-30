import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationService } from "../../../platform/notification/notification.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WORKFLOW_INSTANCE_COMPLETED_EVENT } from "../../../platform/workflow-engine/workflow-engine.constants";
import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { validateWorkPermitStatusTransition } from "./work-permit-lifecycle";

const WORK_PERMIT_EXTENSION_WORKFLOW_ENTITY_TYPE = "work_permit_extension";

/**
 * Task 3.4 — KONSUMEN KETUJUH WORKFLOW_INSTANCE_COMPLETED_EVENT (pola
 * PERSIS listener lain modul ini/3.2/2.1/2.2 — payload-only, TIDAK PERNAH
 * re-query workflow_instances/workflow_tasks). APPROVED ->
 * work_permit_extensions.status=APPROVED, work_permits.plannedEndDatetime
 * DIPERBARUI ke requestedNewEndDatetime, status EXTENSION_REQUESTED->ACTIVE.
 * REJECTED -> work_permit_extensions.status=REJECTED, work_permits.status
 * EXTENSION_REQUESTED->ACTIVE TANPA mengubah plannedEndDatetime (extension
 * ditolak, jadwal asli tetap berlaku — permit bisa segera EXPIRED kalau
 * planned_end_datetime asli sudah/segera terlampaui, work-permit-expiry-scan
 * yang akan menangkapnya pada scan berikutnya).
 */
@Injectable()
export class WorkPermitExtensionWorkflowCompletionListener {
  private readonly logger = new Logger(WorkPermitExtensionWorkflowCompletionListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  @OnEvent(WORKFLOW_INSTANCE_COMPLETED_EVENT)
  async onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void> {
    if (payload.entityType !== WORK_PERMIT_EXTENSION_WORKFLOW_ENTITY_TYPE) return;

    await tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
      try {
        if (payload.status === "APPROVED") {
          await this.markApproved(payload.entityId);
        } else if (payload.status === "REJECTED") {
          await this.markRejected(payload.entityId);
        }
      } catch (err) {
        this.logger.error(
          `Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk work_permit_extension=${payload.entityId}: ${err instanceof Error ? err.message : err}`,
        );
      }
    });
  }

  private async markApproved(extensionId: string): Promise<void> {
    const { permitNumber, requestedBy } = await this.prisma.withRls(async (tx) => {
      const extension = await tx.workPermitExtension.update({ where: { id: extensionId }, data: { status: "APPROVED" } });
      const permit = await tx.workPermit.findUniqueOrThrow({ where: { id: extension.workPermitId } });
      validateWorkPermitStatusTransition(permit.status, "ACTIVE");
      const updatedPermit = await tx.workPermit.update({
        where: { id: extension.workPermitId },
        data: { status: "ACTIVE", plannedEndDatetime: extension.requestedNewEndDatetime },
      });
      return { permitNumber: updatedPermit.permitNumber, requestedBy: extension.requestedBy };
    });

    await this.notificationService.enqueue({
      eventType: "WORK_PERMIT_EXTENSION_APPROVED",
      entityType: "WORK_PERMIT_EXTENSION",
      entityId: extensionId,
      recipientUserId: requestedBy,
      priority: "MEDIUM",
      eventCategory: "WORK_PERMIT",
      variables: { permitNumber },
    });
  }

  private async markRejected(extensionId: string): Promise<void> {
    const { permitNumber, requestedBy } = await this.prisma.withRls(async (tx) => {
      const extension = await tx.workPermitExtension.update({ where: { id: extensionId }, data: { status: "REJECTED" } });
      const permit = await tx.workPermit.findUniqueOrThrow({ where: { id: extension.workPermitId } });
      validateWorkPermitStatusTransition(permit.status, "ACTIVE");
      const updatedPermit = await tx.workPermit.update({ where: { id: extension.workPermitId }, data: { status: "ACTIVE" } });
      return { permitNumber: updatedPermit.permitNumber, requestedBy: extension.requestedBy };
    });

    await this.notificationService.enqueue({
      eventType: "WORK_PERMIT_EXTENSION_REJECTED",
      entityType: "WORK_PERMIT_EXTENSION",
      entityId: extensionId,
      recipientUserId: requestedBy,
      priority: "MEDIUM",
      eventCategory: "WORK_PERMIT",
      variables: { permitNumber },
    });
  }
}
