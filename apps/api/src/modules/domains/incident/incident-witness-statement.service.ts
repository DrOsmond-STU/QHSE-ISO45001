import { Injectable } from "@nestjs/common";
import { IncidentWitnessStatement } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./incident-context";

export interface RecordIncidentWitnessStatementInput {
  incidentReportId: string;
  witnessUserId?: string;
  witnessNameExternal?: string;
  statementText: string;
  statementDatetime: Date;
}

// BR-07 (PRD Modul 07 §6) — "tidak dapat diedit setelah statement_datetime
// difinalisasi — koreksi dicatat sebagai entri baru." TIDAK ADA method
// update() sama sekali di service ini (pola sama HazardRegisterService
// tanpa hard-delete, BR-07 Modul 05, 3.1) — terpenuhi BY CONSTRUCTION,
// koreksi = record() lagi dgn statement_datetime baru.
@Injectable()
export class IncidentWitnessStatementService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordIncidentWitnessStatementInput): Promise<IncidentWitnessStatement> {
    const recordedBy = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) =>
      tx.incidentWitnessStatement.create({
        data: {
          tenantId,
          incidentReportId: input.incidentReportId,
          witnessUserId: input.witnessUserId,
          witnessNameExternal: input.witnessNameExternal,
          statementText: input.statementText,
          statementDatetime: input.statementDatetime,
          recordedBy,
          createdBy: recordedBy,
          updatedBy: recordedBy,
        },
      }),
    );
  }

  async listByReport(incidentReportId: string): Promise<IncidentWitnessStatement[]> {
    return this.prisma.withRls((tx) => tx.incidentWitnessStatement.findMany({ where: { incidentReportId }, orderBy: { statementDatetime: "desc" } }));
  }
}
