import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { CalibrationCertificateService } from "./calibration-certificate.service";
/**
 * Task 6.2 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * calibration_certificate (§4.1 poin 6, 1-stage). Payload-only, pola PERSIS
 * listener modul lain sesi ini.
 */
export declare class CalibrationCertificateReviewCompletionListener {
    private readonly certificateService;
    private readonly logger;
    constructor(certificateService: CalibrationCertificateService);
    onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void>;
}
