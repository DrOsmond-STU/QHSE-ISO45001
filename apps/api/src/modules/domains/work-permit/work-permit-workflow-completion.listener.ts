import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationService } from "../../../platform/notification/notification.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WORKFLOW_INSTANCE_COMPLETED_EVENT } from "../../../platform/workflow-engine/workflow-engine.constants";
import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { WorkPermitApprovalCacheService } from "./work-permit-approval-cache.service";
import { validateWorkPermitStatusTransition } from "./work-permit-lifecycle";

const WORK_PERMIT_WORKFLOW_ENTITY_TYPE = "work_permit";

/**
 * Task 3.3 — KONSUMEN KEENAM WORKFLOW_INSTANCE_COMPLETED_EVENT (pola PERSIS
 * listener HIRA/JSA/HIRADC 3.2/DMS 2.1/Compliance 2.2 — payload-only,
 * TIDAK PERNAH re-query workflow_instances/workflow_tasks, lihat banner
 * comment race-condition lengkap di DocumentWorkflowCompletionListener 2.1).
 * APPROVED (baik lewat 1 stage MAUPUN 2 stage percabangan BR-04 — listener
 * ini TIDAK PEDULI berapa stage yang dilalui) -> status=APPROVED (BUKAN
 * ACTIVE — aktivasi lapis TERPISAH via WorkPermitService.activate(), gated
 * BR-02/BR-03, PRD tidak menyebut auto-activate). REJECTED -> status=
 * REJECTED (TERMINAL — beda dari HIRA REQUIRES_REVISION/JSA-tetap-DRAFT,
 * work_permits TIDAK py status "kembali revisi" tersendiri di enum literal
 * PRD §5; teks PRD §4 poin 4 "Approve/Return ke Requester" utk Stage 1
 * genuinely bisa dibaca sbg loop-back DRAFT — interpretasi REJECTED
 * terminal dipilih supaya nilai enum itu genuinely reachable, didokumentasikan
 * ambigu di work-permit-lifecycle.ts, BUKAN disembunyikan). Me-refresh
 * work_permit_approvals (cache read-model, task 135) di KEDUA jalur.
 */
@Injectable()
export class WorkPermitWorkflowCompletionListener {
  private readonly logger = new Logger(WorkPermitWorkflowCompletionListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly approvalCacheService: WorkPermitApprovalCacheService,
  ) {}

  @OnEvent(WORKFLOW_INSTANCE_COMPLETED_EVENT)
  async onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void> {
    if (payload.entityType !== WORK_PERMIT_WORKFLOW_ENTITY_TYPE) return;

    await tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
      try {
        if (payload.status === "APPROVED") {
          await this.markApproved(payload.entityId);
        } else if (payload.status === "REJECTED") {
          await this.markRejected(payload.entityId);
        }
        await this.approvalCacheService.refresh(payload.entityId);
      } catch (err) {
        this.logger.error(
          `Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk work_permit=${payload.entityId}: ${err instanceof Error ? err.message : err}`,
        );
      }
    });
  }

  private async markApproved(workPermitId: string): Promise<void> {
    const { requesterId, permitNumber } = await this.prisma.withRls(async (tx) => {
      const permit = await tx.workPermit.findUniqueOrThrow({ where: { id: workPermitId } });
      validateWorkPermitStatusTransition(permit.status, "APPROVED");
      const updated = await tx.workPermit.update({ where: { id: workPermitId }, data: { status: "APPROVED" } });
      return { requesterId: updated.requesterId, permitNumber: updated.permitNumber };
    });

    // PRD §8 "Permit disetujui penuh -> Requester -> 'Permit {permit_number}
    // disetujui, siap diaktifkan'".
    await this.notificationService.enqueue({
      eventType: "WORK_PERMIT_APPROVED",
      entityType: "WORK_PERMIT",
      entityId: workPermitId,
      recipientUserId: requesterId,
      priority: "MEDIUM",
      eventCategory: "WORK_PERMIT",
      variables: { permitNumber },
    });
  }

  private async markRejected(workPermitId: string): Promise<void> {
    const { requesterId, permitNumber } = await this.prisma.withRls(async (tx) => {
      const permit = await tx.workPermit.findUniqueOrThrow({ where: { id: workPermitId } });
      validateWorkPermitStatusTransition(permit.status, "REJECTED");
      const updated = await tx.workPermit.update({ where: { id: workPermitId }, data: { status: "REJECTED" } });
      return { requesterId: updated.requesterId, permitNumber: updated.permitNumber };
    });

    // BEYOND baris literal PRD §8 (TIDAK ADA baris "permit rejected"
    // eksplisit di tabel notifikasi) — analog WORK_PERMIT_APPROVED di atas,
    // pola PERSIS DOCUMENT_VERSION_REJECTED (2.1)/COMPLIANCE_EVALUATION_REJECTED
    // (2.2)/HIRA_REQUIRES_REVISION+JSA_REJECTED+HIRADC_REJECTED (3.2).
    await this.notificationService.enqueue({
      eventType: "WORK_PERMIT_REJECTED",
      entityType: "WORK_PERMIT",
      entityId: workPermitId,
      recipientUserId: requesterId,
      priority: "MEDIUM",
      eventCategory: "WORK_PERMIT",
      variables: { permitNumber },
    });
  }
}
