import { Injectable } from "@nestjs/common";
import { AuditReport } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { requireActorUserId, requireTenantId } from "./audit-context";
import { AuditWorkflowBootstrapService } from "./audit-workflow-bootstrap.service";
import { AuditService } from "./audit.service";

// Lihat banner comment AuditWorkflowBootstrapService.ensureAuditReportWorkflowDefinition.
const AUDIT_REPORT_WORKFLOW_ENTITY_TYPE = "audit_report";

export interface UpdateAuditReportContentInput {
  executiveSummary?: string;
  scopeDescription?: string;
  methodologyDescription?: string;
  conclusion?: string;
}

/**
 * Task 4.1 (Modul 09 §4 poin 7, §3 "Lead Auditor | audit.report.generate").
 * BELUM ada controller HTTP. Stage 1 workflow ("Review Lead Auditor")
 * CONTEXT_USER — contextData.contextUserId diisi dari audits.lead_auditor_id
 * SAAT submitForApproval() (bukan dari user yang submit), pola PERSIS
 * DocumentVersionService (2.1). audits.workflow_instance_id (kolom
 * denormalized, lihat banner comment Audit.workflowInstanceId di
 * schema.prisma) DITULIS BERSAMAAN dgn audit_reports.workflow_instance_id
 * di method yang SAMA supaya TIDAK PERNAH divergen.
 */
@Injectable()
export class AuditReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bootstrapService: AuditWorkflowBootstrapService,
    private readonly workflowEngineService: WorkflowEngineService,
    private readonly auditService: AuditService,
  ) {}

  async create(auditId: string): Promise<AuditReport> {
    const preparedBy = requireActorUserId();
    const tenantId = requireTenantId();

    const existing = await this.prisma.withRls((tx) => tx.auditReport.findUnique({ where: { auditId } }));
    if (existing) {
      throw new Error("audit_reports untuk audit ini sudah ada (audit_id UNIQUE).");
    }

    const findings = await this.prisma.withRls((tx) => tx.auditFinding.findMany({ where: { auditId, deletedAt: null } }));
    const totalMajorNc = findings.filter((f) => f.classification === "MAJOR_NC").length;
    const totalMinorNc = findings.filter((f) => f.classification === "MINOR_NC").length;
    const totalObservation = findings.filter((f) => f.classification === "OBSERVATION").length;
    const totalOfi = findings.filter((f) => f.classification === "OFI").length;

    const report = await this.prisma.withRls((tx) =>
      tx.auditReport.create({
        data: {
          tenantId,
          auditId,
          totalMajorNc,
          totalMinorNc,
          totalObservation,
          totalOfi,
          preparedBy,
          preparedAt: new Date(),
          createdBy: preparedBy,
          updatedBy: preparedBy,
        },
      }),
    );

    await this.auditService.markReportDrafted(auditId);
    return report;
  }

  async updateContent(auditReportId: string, input: UpdateAuditReportContentInput): Promise<AuditReport> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.auditReport.update({
        where: { id: auditReportId },
        data: {
          executiveSummary: input.executiveSummary,
          scopeDescription: input.scopeDescription,
          methodologyDescription: input.methodologyDescription,
          conclusion: input.conclusion,
          updatedBy,
        },
      }),
    );
  }

  async submitForApproval(auditReportId: string): Promise<AuditReport> {
    const actorId = requireActorUserId();

    const report = await this.prisma.withRls((tx) => tx.auditReport.findUniqueOrThrow({ where: { id: auditReportId } }));
    if (report.workflowInstanceId) {
      throw new Error("audit_reports sudah punya workflow_instance aktif — tunggu hasil approval sebelum submit ulang.");
    }
    const audit = await this.prisma.withRls((tx) => tx.audit.findUniqueOrThrow({ where: { id: report.auditId } }));

    const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureAuditReportWorkflowDefinition(tx));
    const instance = await this.workflowEngineService.startInstance(AUDIT_REPORT_WORKFLOW_ENTITY_TYPE, auditReportId, definition.id, {
      contextUserId: audit.leadAuditorId,
    });

    await this.prisma.withRls((tx) =>
      tx.audit.update({ where: { id: audit.id }, data: { workflowInstanceId: instance.id, updatedBy: actorId } }),
    );
    return this.prisma.withRls((tx) =>
      tx.auditReport.update({ where: { id: auditReportId }, data: { workflowInstanceId: instance.id, updatedBy: actorId } }),
    );
  }

  /**
   * Dipanggil AuditReportWorkflowCompletionListener saat workflow APPROVED
   * — approvedAt terisi, approvedBy SELALU NULL (WorkflowInstanceCompletedEvent
   * tidak punya field actor, pola sama seluruh listener modul lain), lalu
   * memicu AuditService.markReportApproved() (audits.status->REPORT_APPROVED/
   * PENDING_CAPA_CLOSURE).
   */
  async markApproved(auditReportId: string): Promise<AuditReport> {
    const report = await this.prisma.withRls((tx) =>
      tx.auditReport.update({ where: { id: auditReportId }, data: { approvedAt: new Date() } }),
    );
    await this.auditService.markReportApproved(report.auditId);
    return report;
  }

  /**
   * Dipanggil listener saat workflow REJECTED — workflow_instance_id
   * di-null-kan (audit_reports DAN audits, keduanya kolom denormalized yang
   * sama) utk resubmission. audits.status TETAP REPORT_DRAFTED (sudah benar
   * labelnya, tidak perlu transisi apa pun).
   */
  async returnToDraft(auditReportId: string): Promise<AuditReport> {
    const report = await this.prisma.withRls((tx) =>
      tx.auditReport.update({ where: { id: auditReportId }, data: { workflowInstanceId: null } }),
    );
    await this.prisma.withRls((tx) => tx.audit.update({ where: { id: report.auditId }, data: { workflowInstanceId: null } }));
    return report;
  }

  // PRD §11 "wajib dapat digenerate & disimpan sbg dokumen terkontrol" —
  // linkage MANUAL, TIDAK ADA auto-create dokumen DMS (lihat banner comment
  // AuditReport.documentId di schema.prisma).
  async linkDocument(auditReportId: string, documentId: string): Promise<AuditReport> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) => tx.auditReport.update({ where: { id: auditReportId }, data: { documentId, updatedBy } }));
  }

  async getById(auditReportId: string): Promise<AuditReport> {
    return this.prisma.withRls((tx) => tx.auditReport.findUniqueOrThrow({ where: { id: auditReportId } }));
  }

  async getByAuditId(auditId: string): Promise<AuditReport | null> {
    return this.prisma.withRls((tx) => tx.auditReport.findUnique({ where: { auditId } }));
  }
}
