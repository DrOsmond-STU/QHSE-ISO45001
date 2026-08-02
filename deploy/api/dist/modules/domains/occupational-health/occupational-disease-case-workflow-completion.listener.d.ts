import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { OccupationalDiseaseCaseService } from "./occupational-disease-case.service";
/**
 * Task 5.3 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * occupational_disease_case (workflow OH_PAK_CASE 2-stage: konfirmasi
 * diagnosis Physician + review sistemik HSE Manager). Payload-only, pola
 * PERSIS EnvironmentalAspectReviewWorkflowCompletionListener 5.2 —
 * APPROVED/REJECTED SAMA-SAMA hanya clear workflowInstanceId
 * (markReviewCompleted(), lihat banner comment kelas itu soal alasan
 * case_status TIDAK ikut berubah di sini).
 */
export declare class OccupationalDiseaseCaseWorkflowCompletionListener {
    private readonly pakCaseService;
    private readonly logger;
    constructor(pakCaseService: OccupationalDiseaseCaseService);
    onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void>;
}
