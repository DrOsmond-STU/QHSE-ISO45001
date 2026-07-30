import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { WORKFLOW_INSTANCE_COMPLETED_EVENT } from "../../../platform/workflow-engine/workflow-engine.constants";
import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { CalibrationCertificateService, CERTIFICATE_WORKFLOW_ENTITY_TYPE } from "./calibration-certificate.service";

/**
 * Task 6.2 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * calibration_certificate (§4.1 poin 6, 1-stage). Payload-only, pola PERSIS
 * listener modul lain sesi ini.
 */
@Injectable()
export class CalibrationCertificateReviewCompletionListener {
  private readonly logger = new Logger(CalibrationCertificateReviewCompletionListener.name);

  constructor(private readonly certificateService: CalibrationCertificateService) {}

  @OnEvent(WORKFLOW_INSTANCE_COMPLETED_EVENT)
  async onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void> {
    if (payload.entityType !== CERTIFICATE_WORKFLOW_ENTITY_TYPE) return;

    await tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
      try {
        await this.certificateService.onReviewCompleted(payload.entityId, payload.status === "APPROVED");
      } catch (err) {
        this.logger.error(
          `Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk calibration_certificate=${payload.entityId}: ${err instanceof Error ? err.message : err}`,
        );
      }
    });
  }
}
