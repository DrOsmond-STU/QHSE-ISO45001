import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { SupplierQualityRecordService } from "./supplier-quality-record.service";
/**
 * Task 5.1 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * supplier_quality_record. APPROVED -> markApproved() (status APPROVED,
 * correctiveActionRequired dihitung dari rating) + PRD §8 "Supplier rating
 * turun ke Suspended/Disqualified | Quality Manager" (Procurement eksternal
 * via Modul 30 TIDAK diimplementasikan — belum ada modul itu). REJECTED ->
 * kembali DRAFT.
 */
export declare class SupplierEvalWorkflowCompletionListener {
    private readonly prisma;
    private readonly supplierQualityRecordService;
    private readonly notificationService;
    private readonly logger;
    constructor(prisma: PrismaService, supplierQualityRecordService: SupplierQualityRecordService, notificationService: NotificationService);
    onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void>;
}
