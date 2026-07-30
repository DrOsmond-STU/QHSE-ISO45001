import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { WORKFLOW_INSTANCE_COMPLETED_EVENT } from "../../../platform/workflow-engine/workflow-engine.constants";
import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { SupplierQualityRecordService } from "./supplier-quality-record.service";

const SUPPLIER_EVAL_WORKFLOW_ENTITY_TYPE = "supplier_quality_record";

/**
 * Task 5.1 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * supplier_quality_record. APPROVED -> markApproved() (status APPROVED,
 * correctiveActionRequired dihitung dari rating) + PRD §8 "Supplier rating
 * turun ke Suspended/Disqualified | Quality Manager" (Procurement eksternal
 * via Modul 30 TIDAK diimplementasikan — belum ada modul itu). REJECTED ->
 * kembali DRAFT.
 */
@Injectable()
export class SupplierEvalWorkflowCompletionListener {
  private readonly logger = new Logger(SupplierEvalWorkflowCompletionListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supplierQualityRecordService: SupplierQualityRecordService,
    private readonly notificationService: NotificationService,
  ) {}

  @OnEvent(WORKFLOW_INSTANCE_COMPLETED_EVENT)
  async onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void> {
    if (payload.entityType !== SUPPLIER_EVAL_WORKFLOW_ENTITY_TYPE) return;

    await tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
      try {
        if (payload.status === "APPROVED") {
          const record = await this.supplierQualityRecordService.markApproved(payload.entityId);
          if (record.rating === "SUSPENDED" || record.rating === "DISQUALIFIED") {
            const qualityManagers = await this.prisma.withRls((tx) =>
              tx.user.findMany({
                where: { tenantId: payload.tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "QUALITY_MANAGER" } } } },
                select: { id: true },
              }),
            );
            for (const qm of qualityManagers) {
              await this.notificationService.enqueue({
                eventType: "QUALITY_SUPPLIER_RATING_DOWNGRADED",
                entityType: "SUPPLIER_QUALITY_RECORD",
                entityId: record.id,
                recipientUserId: qm.id,
                priority: "HIGH",
                eventCategory: "QUALITY",
                variables: { supplierName: record.supplierName, rating: record.rating },
              });
            }
          }
        } else if (payload.status === "REJECTED") {
          await this.supplierQualityRecordService.returnToDraft(payload.entityId);
        }
      } catch (err) {
        this.logger.error(
          `Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk supplier_quality_record=${payload.entityId}: ${err instanceof Error ? err.message : err}`,
        );
      }
    });
  }
}
