import { BadRequestException, Injectable } from "@nestjs/common";
import { IncidentRegulatoryReport } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId } from "./incident-context";

// PRD §5/§6 BR-03 — baris incident_regulatory_reports diciptakan OTOMATIS
// oleh IncidentInvestigationService.submitForApproval() (BR-03 auto-create),
// TIDAK ADA method create() manual di service ini — service ini murni
// melacak status kirim (PENDING->SUBMITTED->ACKNOWLEDGED), pola "1
// tracker/scan job" sama licenses_permits (2.2).
@Injectable()
export class IncidentRegulatoryReportService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(incidentRegulatoryReportId: string, officialReferenceNumber?: string): Promise<IncidentRegulatoryReport> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      const report = await tx.incidentRegulatoryReport.findUniqueOrThrow({ where: { id: incidentRegulatoryReportId } });
      if (report.status !== "PENDING" && report.status !== "OVERDUE") {
        throw new BadRequestException(`incident_regulatory_reports berstatus ${report.status} tidak dapat disubmit (wajib PENDING/OVERDUE).`);
      }
      return tx.incidentRegulatoryReport.update({
        where: { id: incidentRegulatoryReportId },
        data: { status: "SUBMITTED", submittedDate: new Date(), submittedBy: updatedBy, officialReferenceNumber, updatedBy },
      });
    });
  }

  async acknowledge(incidentRegulatoryReportId: string): Promise<IncidentRegulatoryReport> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      const report = await tx.incidentRegulatoryReport.findUniqueOrThrow({ where: { id: incidentRegulatoryReportId } });
      if (report.status !== "SUBMITTED") {
        throw new BadRequestException(`incident_regulatory_reports berstatus ${report.status} tidak dapat diakui (wajib SUBMITTED).`);
      }
      return tx.incidentRegulatoryReport.update({ where: { id: incidentRegulatoryReportId }, data: { status: "ACKNOWLEDGED", updatedBy } });
    });
  }

  async listByReport(incidentReportId: string): Promise<IncidentRegulatoryReport[]> {
    return this.prisma.withRls((tx) => tx.incidentRegulatoryReport.findMany({ where: { incidentReportId }, orderBy: { requiredByDate: "asc" } }));
  }
}
