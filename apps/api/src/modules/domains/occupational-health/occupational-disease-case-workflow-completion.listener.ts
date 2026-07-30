import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { WORKFLOW_INSTANCE_COMPLETED_EVENT } from "../../../platform/workflow-engine/workflow-engine.constants";
import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { OccupationalDiseaseCaseService } from "./occupational-disease-case.service";

const PAK_CASE_WORKFLOW_ENTITY_TYPE = "occupational_disease_case";

/**
 * Task 5.3 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * occupational_disease_case (workflow OH_PAK_CASE 2-stage: konfirmasi
 * diagnosis Physician + review sistemik HSE Manager). Payload-only, pola
 * PERSIS EnvironmentalAspectReviewWorkflowCompletionListener 5.2 —
 * APPROVED/REJECTED SAMA-SAMA hanya clear workflowInstanceId
 * (markReviewCompleted(), lihat banner comment kelas itu soal alasan
 * case_status TIDAK ikut berubah di sini).
 */
@Injectable()
export class OccupationalDiseaseCaseWorkflowCompletionListener {
  private readonly logger = new Logger(OccupationalDiseaseCaseWorkflowCompletionListener.name);

  constructor(private readonly pakCaseService: OccupationalDiseaseCaseService) {}

  @OnEvent(WORKFLOW_INSTANCE_COMPLETED_EVENT)
  async onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void> {
    if (payload.entityType !== PAK_CASE_WORKFLOW_ENTITY_TYPE) return;

    await tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
      try {
        if (payload.status === "APPROVED" || payload.status === "REJECTED") {
          await this.pakCaseService.markReviewCompleted(payload.entityId);
        }
      } catch (err) {
        this.logger.error(
          `Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk occupational_disease_case=${payload.entityId}: ${err instanceof Error ? err.message : err}`,
        );
      }
    });
  }
}
