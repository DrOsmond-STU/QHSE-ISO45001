import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
/**
 * Task 3.5 — KEDELAPAN KONSUMEN WORKFLOW_INSTANCE_COMPLETED_EVENT (pola
 * PERSIS listener lain modul ini/3.4/3.3/3.2/2.1/2.2 — payload-only, TIDAK
 * PERNAH re-query workflow_instances/workflow_tasks). APPROVED ->
 * incident_investigations.status=APPROVED, incident_reports.status
 * UNDER_INVESTIGATION->INVESTIGATION_COMPLETED, LALU (SATU transaksi yang
 * sama) ->PENDING_REGULATORY_REPORT kalau ADA baris incident_regulatory_reports
 * utk permit ini (BR-03 sudah membuatnya saat submitForApproval()).
 * REJECTED -> incident_investigations.status=RETURNED (BUKAN "REJECTED" —
 * enum IncidentInvestigationStatus tidak py nilai itu), incident_reports.status
 * TETAP UNDER_INVESTIGATION (HSE Officer merevisi/membuat investigasi baru).
 */
export declare class IncidentWorkflowCompletionListener {
    private readonly prisma;
    private readonly notificationService;
    private readonly logger;
    constructor(prisma: PrismaService, notificationService: NotificationService);
    onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void>;
    private markApproved;
    private markReturned;
}
