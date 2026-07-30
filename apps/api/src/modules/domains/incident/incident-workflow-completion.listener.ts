import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { WORKFLOW_INSTANCE_COMPLETED_EVENT } from "../../../platform/workflow-engine/workflow-engine.constants";
import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { validateIncidentReportStatusTransition } from "./incident-lifecycle";

const INCIDENT_INVESTIGATION_WORKFLOW_ENTITY_TYPE = "incident_investigation";

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
@Injectable()
export class IncidentWorkflowCompletionListener {
  private readonly logger = new Logger(IncidentWorkflowCompletionListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  @OnEvent(WORKFLOW_INSTANCE_COMPLETED_EVENT)
  async onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void> {
    if (payload.entityType !== INCIDENT_INVESTIGATION_WORKFLOW_ENTITY_TYPE) return;

    await tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
      try {
        if (payload.status === "APPROVED") {
          await this.markApproved(payload.entityId);
        } else if (payload.status === "REJECTED") {
          await this.markReturned(payload.entityId);
        }
      } catch (err) {
        this.logger.error(
          `Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk incident_investigation=${payload.entityId}: ${err instanceof Error ? err.message : err}`,
        );
      }
    });
  }

  private async markApproved(investigationId: string): Promise<void> {
    const { incidentNumber, requestedBy } = await this.prisma.withRls(async (tx) => {
      const investigation = await tx.incidentInvestigation.update({ where: { id: investigationId }, data: { status: "APPROVED" } });
      const report = await tx.incidentReport.findUniqueOrThrow({ where: { id: investigation.incidentReportId } });
      validateIncidentReportStatusTransition(report.status, "INVESTIGATION_COMPLETED");
      let updatedReport = await tx.incidentReport.update({ where: { id: report.id }, data: { status: "INVESTIGATION_COMPLETED" } });

      const hasRegulatoryReport = (await tx.incidentRegulatoryReport.count({ where: { incidentReportId: report.id } })) > 0;
      if (hasRegulatoryReport) {
        validateIncidentReportStatusTransition(updatedReport.status, "PENDING_REGULATORY_REPORT");
        updatedReport = await tx.incidentReport.update({ where: { id: report.id }, data: { status: "PENDING_REGULATORY_REPORT" } });
      }

      return { incidentNumber: updatedReport.incidentNumber, requestedBy: investigation.leadInvestigatorId };
    });

    await this.notificationService.enqueue({
      eventType: "INCIDENT_INVESTIGATION_APPROVED",
      entityType: "INCIDENT_INVESTIGATION",
      entityId: investigationId,
      recipientUserId: requestedBy,
      priority: "MEDIUM",
      eventCategory: "INCIDENT",
      variables: { incidentNumber },
    });
  }

  private async markReturned(investigationId: string): Promise<void> {
    const { incidentNumber, requestedBy } = await this.prisma.withRls(async (tx) => {
      const investigation = await tx.incidentInvestigation.update({ where: { id: investigationId }, data: { status: "RETURNED" } });
      const report = await tx.incidentReport.findUniqueOrThrow({ where: { id: investigation.incidentReportId } });
      return { incidentNumber: report.incidentNumber, requestedBy: investigation.leadInvestigatorId };
    });

    await this.notificationService.enqueue({
      eventType: "INCIDENT_INVESTIGATION_RETURNED",
      entityType: "INCIDENT_INVESTIGATION",
      entityId: investigationId,
      recipientUserId: requestedBy,
      priority: "MEDIUM",
      eventCategory: "INCIDENT",
      variables: { incidentNumber },
    });
  }
}
