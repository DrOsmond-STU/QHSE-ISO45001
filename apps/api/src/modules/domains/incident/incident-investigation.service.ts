import { BadRequestException, Injectable } from "@nestjs/common";
import {
  IncidentInvestigation,
  IncidentInvestigationMethod,
  IncidentInvestigationTeam,
  IncidentInvestigationTeamRole,
  IncidentRootCause,
  IncidentRootCauseCategory,
  IncidentRootCauseType,
} from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { requireActorUserId, requireTenantId } from "./incident-context";
import { validateIncidentReportStatusTransition } from "./incident-lifecycle";
import { computeRequiredByDate, shouldAutoCreateRegulatoryReport } from "./incident-regulatory-report-rules";
import { IncidentWorkflowBootstrapService } from "./incident-workflow-bootstrap.service";

const INCIDENT_INVESTIGATION_WORKFLOW_ENTITY_TYPE = "incident_investigation";
const DEFAULT_REGULATORY_REPORT_TYPE = "Laporan Kecelakaan Kerja Tahap 1";

export interface CreateIncidentInvestigationInput {
  incidentReportId: string;
  method: IncidentInvestigationMethod;
  methodOtherDetail?: string;
  leadInvestigatorId: string;
  startedAt: Date;
  targetCompletionAt: Date;
}

export interface RecordIncidentRootCauseInput {
  causeType: IncidentRootCauseType;
  category: IncidentRootCauseCategory;
  description: string;
  methodReference?: string;
  sequenceNo?: number;
}

// Task 3.5 (Modul 07 §4 poin 4-7). TIDAK ADA wrapper BR-09-style di atas
// actOnTask() (BEDA dari WorkPermitService.actOnApprovalTask(), 3.3) — PRD
// Modul 07 §6 TIDAK punya BR segregation-of-duty utk investigasi; kedua
// stage sama-sama HSE_MANAGER (bukan requester-vs-approver), jadi caller
// panggil WorkflowEngineService.actOnTask() LANGSUNG, pola sama HIRA/JSA/
// HIRADC/DMS/Compliance.
@Injectable()
export class IncidentInvestigationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowEngineService: WorkflowEngineService,
    private readonly bootstrapService: IncidentWorkflowBootstrapService,
  ) {}

  /** PRD §4 poin 4 "wajib utk FATALITY/LTI/PSE/RESTRICTED_WORK_CASE;
   * opsional/sampling lainnya" — TIDAK ditegakkan sbg guard DI SINI (siapa
   * pun dgn permission boleh membuat investigasi utk klasifikasi apa pun,
   * termasuk NEAR_MISS "sampling") — hanya BR-01 (gate CLOSED) yang
   * genuinely menegakkan kewajiban utk 3 klasifikasi spesifik. */
  async create(input: CreateIncidentInvestigationInput): Promise<IncidentInvestigation> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    return this.prisma.withRls(async (tx) => {
      const report = await tx.incidentReport.findUniqueOrThrow({ where: { id: input.incidentReportId } });
      validateIncidentReportStatusTransition(report.status, "UNDER_INVESTIGATION");

      const investigation = await tx.incidentInvestigation.create({
        data: {
          tenantId,
          incidentReportId: input.incidentReportId,
          method: input.method,
          methodOtherDetail: input.methodOtherDetail,
          leadInvestigatorId: input.leadInvestigatorId,
          startedAt: input.startedAt,
          targetCompletionAt: input.targetCompletionAt,
          status: "IN_PROGRESS",
          createdBy,
          updatedBy: createdBy,
        },
      });
      await tx.incidentReport.update({ where: { id: input.incidentReportId }, data: { status: "UNDER_INVESTIGATION", updatedBy: createdBy } });
      return investigation;
    });
  }

  async assignTeam(incidentInvestigationId: string, userId: string, roleInTeam: IncidentInvestigationTeamRole): Promise<IncidentInvestigationTeam> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) =>
      tx.incidentInvestigationTeam.create({
        data: { tenantId, incidentInvestigationId, userId, roleInTeam, createdBy, updatedBy: createdBy },
      }),
    );
  }

  async recordRootCause(incidentInvestigationId: string, input: RecordIncidentRootCauseInput): Promise<IncidentRootCause> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) =>
      tx.incidentRootCause.create({
        data: {
          tenantId,
          incidentInvestigationId,
          causeType: input.causeType,
          category: input.category,
          description: input.description,
          methodReference: input.methodReference,
          sequenceNo: input.sequenceNo,
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );
  }

  /**
   * PRD §4 poin 7-8 — Review & Approval via Workflow Engine
   * (entity_type=incident_investigation), diikuti (BR-03) pembuatan
   * incident_regulatory_reports otomatis kalau classification permit induk
   * masuk kategori wajib lapor. Auto-create regulatory report DI SINI (SAAT
   * submit, BUKAN setelah approval — lihat banner comment
   * IncidentWorkflowBootstrapService.ensureWorkflowDefinition()) supaya
   * Stage 2 workflow ini SENDIRI (kondisional hasRegulatoryReport) punya
   * data yang genuinely sudah ada saat kondisi dievaluasi — interpretasi
   * urutan §4 poin 7 vs 8 didokumentasikan TDD §26. EMPAT transaksi
   * terpisah, pola PERSIS WorkPermitExtensionService.request() (3.4).
   */
  async submitForApproval(incidentInvestigationId: string): Promise<IncidentInvestigation> {
    const actorId = requireActorUserId();
    const tenantId = requireTenantId();

    const hasRegulatoryReport = await this.prisma.withRls(async (tx) => {
      const investigation = await tx.incidentInvestigation.findUniqueOrThrow({ where: { id: incidentInvestigationId } });
      if (investigation.status !== "IN_PROGRESS") {
        throw new BadRequestException(`incident_investigations berstatus ${investigation.status} tidak dapat diajukan (wajib IN_PROGRESS).`);
      }
      const report = await tx.incidentReport.findUniqueOrThrow({ where: { id: investigation.incidentReportId } });

      let regulatoryReport = await tx.incidentRegulatoryReport.findFirst({ where: { incidentReportId: report.id } });
      if (!regulatoryReport && shouldAutoCreateRegulatoryReport(report.classification)) {
        regulatoryReport = await tx.incidentRegulatoryReport.create({
          data: {
            tenantId,
            incidentReportId: report.id,
            regulatoryBody: "KEMNAKER",
            reportType: DEFAULT_REGULATORY_REPORT_TYPE,
            requiredByDate: computeRequiredByDate(report.incidentDatetime),
            status: "PENDING",
            createdBy: actorId,
            updatedBy: actorId,
          },
        });
      }
      return regulatoryReport !== null;
    });

    const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureWorkflowDefinition(tx));
    const instance = await this.workflowEngineService.startInstance(INCIDENT_INVESTIGATION_WORKFLOW_ENTITY_TYPE, incidentInvestigationId, definition.id, {
      hasRegulatoryReport,
    });

    return this.prisma.withRls((tx) =>
      tx.incidentInvestigation.update({
        where: { id: incidentInvestigationId },
        data: { status: "PENDING_REVIEW", workflowInstanceId: instance.id, updatedBy: actorId },
      }),
    );
  }

  async getById(incidentInvestigationId: string) {
    return this.prisma.withRls((tx) =>
      tx.incidentInvestigation.findUniqueOrThrow({
        where: { id: incidentInvestigationId },
        include: { team: true, rootCauses: true },
      }),
    );
  }
}
