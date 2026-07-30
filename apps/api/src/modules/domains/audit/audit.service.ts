import { Injectable } from "@nestjs/common";
import { Audit } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { requireActorUserId, requireTenantId } from "./audit-context";
import { AuditWorkflowBootstrapService } from "./audit-workflow-bootstrap.service";
import { assertAuditCloseAllowed, validateAuditStatusTransition } from "./audit-lifecycle";
import { validateAuditProgramPlanItemStatusTransition } from "./audit-program-lifecycle";
import { checkLeadAuditorCompetencyWarnings } from "./auditor-competency-rules";

const AUDIT_NUMBERING_MODULE_CODE = "AUDIT";

export interface CreateAuditInput {
  siteId: string;
  auditTypeId: string;
  auditChecklistId: string;
  leadAuditorId: string;
  plannedStartDate: Date;
  plannedEndDate: Date;
}

export interface AuditStartResult {
  audit: Audit;
  competencyWarnings: string[];
}

/**
 * Task 4.1 (Modul 09 §4 poin 2/5, §3 "Audit Program Owner/MR |
 * audit.audit.schedule"). BELUM ada controller HTTP. companyId/branchId
 * SELALU diturunkan dari site (bukan input caller terpisah), pola PERSIS
 * InspectionRecordService (3.6) — "lokasi auditee" (PRD §5) sepenuhnya
 * ditentukan site-nya.
 */
@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberingService: NumberingService,
    private readonly bootstrapService: AuditWorkflowBootstrapService,
  ) {}

  /**
   * PRD §4 poin 2 "Dari setiap audit_program_plan_items, dibuat instance
   * audits." linked_audit_id (plan item) + audit_program_plan_item_id
   * (audit) diisi ATOMIK dalam TRANSAKSI KEDUA (setelah baris audits
   * genuinely ada, krn linked_audit_id butuh FK ke audit.id yang baru
   * dibuat) — TIDAK atomik lintas KEDUA transaksi (create audit vs update
   * plan item), gap TDD §26 konsisten pola "tidak atomik lintas langkah"
   * (DMS 2.1, dst). APPROVED->IN_PROGRESS pada audit_programs induk
   * (side-effect "audit pertama dibuat dari program ini") DIGABUNG di
   * transaksi kedua yang sama.
   */
  async createFromPlanItem(auditProgramPlanItemId: string, input: CreateAuditInput): Promise<Audit> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    const planItem = await this.prisma.withRls((tx) =>
      tx.auditProgramPlanItem.findUniqueOrThrow({ where: { id: auditProgramPlanItemId } }),
    );
    if (planItem.linkedAuditId) {
      throw new Error("audit_program_plan_items ini sudah memiliki audit terkait (linked_audit_id terisi).");
    }
    validateAuditProgramPlanItemStatusTransition(planItem.status, "EXECUTED");

    const audit = await this.createAuditRow(tenantId, createdBy, auditProgramPlanItemId, input);

    await this.prisma.withRls(async (tx) => {
      await tx.auditProgramPlanItem.update({
        where: { id: auditProgramPlanItemId },
        data: { status: "EXECUTED", linkedAuditId: audit.id, updatedBy: createdBy },
      });
      const program = await tx.auditProgram.findUnique({ where: { id: planItem.auditProgramId } });
      if (program && program.status === "APPROVED") {
        await tx.auditProgram.update({ where: { id: program.id }, data: { status: "IN_PROGRESS", updatedBy: createdBy } });
      }
    });

    return audit;
  }

  // PRD §4 poin 2 "Audit ad-hoc di luar program (mis. audit investigasi
  // khusus/surveillance mendadak) juga dapat dibuat langsung."
  async createAdHoc(input: CreateAuditInput): Promise<Audit> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    return this.createAuditRow(tenantId, createdBy, null, input);
  }

  private async createAuditRow(
    tenantId: string,
    createdBy: string,
    auditProgramPlanItemId: string | null,
    input: CreateAuditInput,
  ): Promise<Audit> {
    await this.bootstrapService.ensureNumberingConfig(input.siteId);
    const site = await this.prisma.withRls((tx) =>
      tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true, companyId: true, branchId: true } }),
    );
    const auditNumber = await this.numberingService.generateNext(AUDIT_NUMBERING_MODULE_CODE, {
      scopeId: input.siteId,
      variables: { SITE_CODE: site.siteCode },
    });

    return this.prisma.withRls((tx) =>
      tx.audit.create({
        data: {
          tenantId,
          auditNumber,
          auditProgramPlanItemId,
          auditTypeId: input.auditTypeId,
          auditChecklistId: input.auditChecklistId,
          companyId: site.companyId,
          branchId: site.branchId,
          siteId: input.siteId,
          leadAuditorId: input.leadAuditorId,
          plannedStartDate: input.plannedStartDate,
          plannedEndDate: input.plannedEndDate,
          status: "PLANNED",
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );
  }

  // BR-01 — soft warning (TIDAK PERNAH block transisi), lihat banner
  // comment checkLeadAuditorCompetencyWarnings.
  async start(auditId: string): Promise<AuditStartResult> {
    const updatedBy = requireActorUserId();
    const audit = await this.prisma.withRls((tx) =>
      tx.audit.findUniqueOrThrow({ where: { id: auditId }, include: { teamMembers: true, auditChecklist: true } }),
    );
    validateAuditStatusTransition(audit.status, "IN_PROGRESS");

    const leadAuditorIds = audit.teamMembers.filter((m) => m.roleInTeam === "LEAD_AUDITOR").map((m) => m.userId);
    const competencyRecords =
      leadAuditorIds.length === 0
        ? []
        : await this.prisma.withRls((tx) => tx.auditorCompetencyRecord.findMany({ where: { userId: { in: leadAuditorIds } } }));

    const warnings = checkLeadAuditorCompetencyWarnings(
      audit.teamMembers.map((m) => ({ userId: m.userId, roleInTeam: m.roleInTeam })),
      competencyRecords.map((c) => ({ userId: c.userId, standardScope: c.standardScope, status: c.status, expiryDate: c.expiryDate })),
      audit.auditChecklist.standardCode,
      new Date(),
    );

    const updated = await this.prisma.withRls((tx) =>
      tx.audit.update({ where: { id: auditId }, data: { status: "IN_PROGRESS", actualStartDate: new Date(), updatedBy } }),
    );
    return { audit: updated, competencyWarnings: warnings };
  }

  async recordOpeningMeeting(auditId: string, input: { datetime: Date; notes?: string }): Promise<Audit> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.audit.update({
        where: { id: auditId },
        data: { openingMeetingDatetime: input.datetime, openingMeetingNotes: input.notes, updatedBy },
      }),
    );
  }

  async recordClosingMeeting(auditId: string, input: { datetime: Date; notes?: string }): Promise<Audit> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.audit.update({
        where: { id: auditId },
        data: { closingMeetingDatetime: input.datetime, closingMeetingNotes: input.notes, updatedBy },
      }),
    );
  }

  // Dipanggil AuditReportService.create().
  async markReportDrafted(auditId: string): Promise<Audit> {
    const audit = await this.prisma.withRls((tx) => tx.audit.findUniqueOrThrow({ where: { id: auditId } }));
    validateAuditStatusTransition(audit.status, "REPORT_DRAFTED");
    return this.prisma.withRls((tx) => tx.audit.update({ where: { id: auditId }, data: { status: "REPORT_DRAFTED" } }));
  }

  /**
   * Dipanggil AuditReportWorkflowCompletionListener saat workflow
   * audit_report APPROVED. PRD TIDAK beri trigger manual eksplisit utk
   * status PENDING_CAPA_CLOSURE (§5 enum literal py nilai ini tapi §4 TIDAK
   * jelaskan siapa/kapan men-set-nya) — diderivasi OTOMATIS di sini:
   * REPORT_APPROVED SELALU disentuh dulu (status transition jujur), lalu
   * kalau MASIH ada audit_findings wajib-CAPA belum CLOSED, LANGSUNG
   * lanjut ke PENDING_CAPA_CLOSURE sbg langkah kedua internal (bukan
   * transisi manual terpisah) — interpretasi, gap TDD §26.
   */
  async markReportApproved(auditId: string): Promise<Audit> {
    const before = await this.prisma.withRls((tx) => tx.audit.findUniqueOrThrow({ where: { id: auditId } }));
    validateAuditStatusTransition(before.status, "REPORT_APPROVED");
    await this.prisma.withRls((tx) => tx.audit.update({ where: { id: auditId }, data: { status: "REPORT_APPROVED" } }));

    const audit = await this.prisma.withRls((tx) =>
      tx.audit.findUniqueOrThrow({ where: { id: auditId }, include: { findings: true } }),
    );
    const hasUnclosedMandatory = audit.findings.some((f) => f.requiresCapa && f.status !== "CLOSED");
    if (!hasUnclosedMandatory) return audit;

    return this.prisma.withRls((tx) => tx.audit.update({ where: { id: auditId }, data: { status: "PENDING_CAPA_CLOSURE" } }));
  }

  // BR-02/BR-03.
  async close(auditId: string): Promise<Audit> {
    const updatedBy = requireActorUserId();
    const audit = await this.prisma.withRls((tx) =>
      tx.audit.findUniqueOrThrow({ where: { id: auditId }, include: { findings: true, report: true } }),
    );
    assertAuditCloseAllowed(
      audit.findings.map((f) => ({ requiresCapa: f.requiresCapa, status: f.status })),
      audit.report?.approvedAt ? "APPROVED" : null,
    );
    validateAuditStatusTransition(audit.status, "CLOSED");
    return this.prisma.withRls((tx) => tx.audit.update({ where: { id: auditId }, data: { status: "CLOSED", updatedBy } }));
  }

  async cancel(auditId: string): Promise<Audit> {
    const updatedBy = requireActorUserId();
    const audit = await this.prisma.withRls((tx) => tx.audit.findUniqueOrThrow({ where: { id: auditId } }));
    validateAuditStatusTransition(audit.status, "CANCELLED");
    return this.prisma.withRls((tx) => tx.audit.update({ where: { id: auditId }, data: { status: "CANCELLED", updatedBy } }));
  }

  async getById(auditId: string) {
    return this.prisma.withRls((tx) =>
      tx.audit.findUniqueOrThrow({
        where: { id: auditId },
        include: { teamMembers: true, auditeeScopes: true, findings: true, report: true },
      }),
    );
  }

  async listBySite(siteId: string): Promise<Audit[]> {
    return this.prisma.withRls((tx) => tx.audit.findMany({ where: { siteId, deletedAt: null }, orderBy: { plannedStartDate: "desc" } }));
  }
}
