import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { AuditReportService } from "./audit-report.service";
/**
 * Task 4.1 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * audit_report (pola PERSIS AuditProgramWorkflowCompletionListener/listener
 * modul lain — payload-only, TIDAK PERNAH re-query workflow_instances/
 * workflow_tasks). APPROVED -> AuditReportService.markApproved(). REJECTED
 * -> returnToDraft().
 *
 * TIDAK enqueue notifikasi di sini — PRD §8 baris "Laporan audit menunggu
 * approval" hanya utk SAAT SUBMIT (sama alasan AuditProgramWorkflowCompletionListener),
 * TIDAK ADA baris §8 "laporan disetujui/ditolak", gap TDD §26.
 */
export declare class AuditReportWorkflowCompletionListener {
    private readonly reportService;
    private readonly logger;
    constructor(reportService: AuditReportService);
    onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void>;
}
