import { BadRequestException, Injectable } from "@nestjs/common";
import { IncidentClassification, IncidentReport, Prisma } from "@prisma/client";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./incident-context";
import { IncidentWorkflowBootstrapService } from "./incident-workflow-bootstrap.service";
import { assertInvestigationApprovedIfRequiredForClosure } from "./incident-investigation-rules";
import { validateIncidentReportStatusTransition } from "./incident-lifecycle";
import { assertNoPendingOrOverdueRegulatoryReports } from "./incident-regulatory-report-rules";
import { computeSeverityLevel } from "./incident-severity";

const INCIDENT_NUMBERING_MODULE_CODE = "INCIDENT";

export interface CreateIncidentReportInput {
  siteId: string;
  departmentId?: string;
  initialClassification: IncidentClassification;
  incidentDatetime: Date;
  locationDetail?: string;
  description: string;
  immediateActionTaken?: string;
  reportedBy?: string;
  isAnonymous?: boolean;
  injuredPersonId?: string;
  workPermitId?: string;
  involvesContractor?: boolean;
  contractorCompanyId?: string;
  daysLost?: number;
  estimatedCost?: number;
  customFields?: Prisma.InputJsonValue;
}

// Task 3.5 (Modul 07 §4/§5/§6). BELUM ada controller HTTP (pola sama
// seluruh modul domain Phase 2+) — incident.* sudah di-seed RBAC baseline
// (task 153).
@Injectable()
export class IncidentReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberingService: NumberingService,
    private readonly bootstrapService: IncidentWorkflowBootstrapService,
  ) {}

  /**
   * PRD §4 poin 1 "siapa pun membuat incident_reports dgn informasi minimal."
   * incident_number DIGENERATE SAAT CREATE (bukan ditunda), pola PERSIS
   * WorkPermitService.create() (3.3). BR-04 — reportedBy WAJIB null kalau
   * isAnonymous=TRUE (satu-satunya titik dimana kombinasi itu ditentukan;
   * TIDAK ADA method update() yang bisa mengubahnya nanti, jadi "tidak
   * dapat diubah menjadi anonim setelah submit" terpenuhi BY CONSTRUCTION).
   * classification AWAL = initialClassification (sama persis, blm
   * difinalisasi HSE Officer — lihat classify()). severityLevel dihitung
   * dari initialClassification saat ini (computeSeverityLevel(), incident-severity.ts
   * — gap TDD §26, PRD tidak menyediakan tabel pemetaan literal).
   */
  async create(input: CreateIncidentReportInput): Promise<IncidentReport> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    if (input.isAnonymous && input.reportedBy) {
      throw new BadRequestException("incident_reports.reportedBy wajib kosong kalau isAnonymous=TRUE (BR-04).");
    }

    await this.bootstrapService.ensureNumberingConfig(input.siteId);
    const site = await this.prisma.withRls((tx) =>
      tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true, companyId: true, branchId: true } }),
    );
    const incidentNumber = await this.numberingService.generateNext(INCIDENT_NUMBERING_MODULE_CODE, {
      scopeId: input.siteId,
      variables: { SITE_CODE: site.siteCode },
    });

    return this.prisma.withRls((tx) =>
      tx.incidentReport.create({
        data: {
          tenantId,
          incidentNumber,
          companyId: site.companyId,
          branchId: site.branchId,
          siteId: input.siteId,
          departmentId: input.departmentId,
          classification: input.initialClassification,
          initialClassification: input.initialClassification,
          severityLevel: computeSeverityLevel(input.initialClassification),
          incidentDatetime: input.incidentDatetime,
          locationDetail: input.locationDetail,
          description: input.description,
          immediateActionTaken: input.immediateActionTaken,
          reportedBy: input.isAnonymous ? null : input.reportedBy,
          isAnonymous: input.isAnonymous ?? false,
          injuredPersonId: input.injuredPersonId,
          workPermitId: input.workPermitId,
          involvesContractor: input.involvesContractor ?? false,
          contractorCompanyId: input.contractorCompanyId,
          status: "REPORTED",
          daysLost: input.daysLost,
          estimatedCost: input.estimatedCost,
          customFields: input.customFields ?? {},
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );
  }

  /**
   * PRD §4 poin 3 "Verifikasi/triase — HSE Officer memfinalisasi
   * classification (dapat berbeda dari initial_classification, perubahan
   * tercatat di audit log)." BR-02 — jejak perubahan terpenuhi lewat
   * audit_log_trigger generik (TIDAK ada tabel riwayat classification
   * terpisah, pola sama correctRiskLevel() Work Permit 3.3). "memicu
   * perhitungan ulang incident_statistics_cache periode terkait" DIBACA
   * sbg terpenuhi PASIF oleh scan harian berikutnya (BR-06 eksplisit
   * "TIDAK dihitung on-the-fly") — TIDAK ADA panggilan recalc SINKRON di
   * sini, gap didokumentasikan TDD §26. severityLevel ikut dihitung ulang
   * dari classification BARU. status REPORTED->UNDER_VERIFICATION kalau
   * masih REPORTED (reklasifikasi di status LEBIH LANJUT tetap diizinkan
   * tanpa transisi status tambahan — BR-02 tidak membatasi kapan).
   */
  async classify(incidentReportId: string, classification: IncidentClassification): Promise<IncidentReport> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      const report = await tx.incidentReport.findUniqueOrThrow({ where: { id: incidentReportId } });
      const data: Prisma.IncidentReportUncheckedUpdateInput = {
        classification,
        severityLevel: computeSeverityLevel(classification),
        updatedBy,
      };
      if (report.status === "REPORTED") {
        validateIncidentReportStatusTransition("REPORTED", "UNDER_VERIFICATION");
        data.status = "UNDER_VERIFICATION";
      }
      return tx.incidentReport.update({ where: { id: incidentReportId }, data });
    });
  }

  async getById(incidentReportId: string) {
    return this.prisma.withRls((tx) =>
      tx.incidentReport.findUniqueOrThrow({
        where: { id: incidentReportId },
        include: { investigations: true, witnessStatements: true, regulatoryReports: true, correctiveActionLinks: true },
      }),
    );
  }

  /**
   * BR-01 + BR-09 gate, ditegakkan SEBELUM tulis apa pun. Status sumber
   * BOLEH UNDER_VERIFICATION (insiden ringan tanpa investigasi wajib,
   * langsung ditutup), INVESTIGATION_COMPLETED, ATAU PENDING_REGULATORY_REPORT
   * (validateIncidentReportStatusTransition menegakkan mana yang genuinely
   * valid utk baris ini).
   */
  async close(incidentReportId: string): Promise<IncidentReport> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      const report = await tx.incidentReport.findUniqueOrThrow({ where: { id: incidentReportId } });
      validateIncidentReportStatusTransition(report.status, "CLOSED");

      const latestInvestigation = await tx.incidentInvestigation.findFirst({
        where: { incidentReportId },
        orderBy: { createdAt: "desc" },
        select: { status: true },
      });
      assertInvestigationApprovedIfRequiredForClosure(report.classification, latestInvestigation?.status ?? null);

      const regulatoryReports = await tx.incidentRegulatoryReport.findMany({ where: { incidentReportId }, select: { status: true } });
      assertNoPendingOrOverdueRegulatoryReports(regulatoryReports);

      return tx.incidentReport.update({ where: { id: incidentReportId }, data: { status: "CLOSED", updatedBy } });
    });
  }

  /** PRD §5 enum incident_reports.status "REOPENED" + ERD "bisa >1
   * incident_investigations jika REOPENED" — investigasi BARU dibuat
   * terpisah oleh IncidentInvestigationService setelah ini (REOPENED->
   * UNDER_INVESTIGATION, lihat incident-lifecycle.ts). */
  async reopen(incidentReportId: string): Promise<IncidentReport> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      const report = await tx.incidentReport.findUniqueOrThrow({ where: { id: incidentReportId } });
      validateIncidentReportStatusTransition(report.status, "REOPENED");
      return tx.incidentReport.update({ where: { id: incidentReportId }, data: { status: "REOPENED", updatedBy } });
    });
  }
}
