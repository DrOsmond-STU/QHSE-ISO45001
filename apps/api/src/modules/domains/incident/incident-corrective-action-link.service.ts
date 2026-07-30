import { Injectable } from "@nestjs/common";
import { IncidentCorrectiveAction } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./incident-context";

export interface LinkIncidentCorrectiveActionInput {
  incidentReportId: string;
  incidentInvestigationId?: string;
  capaRegisterId: string;
}

// PRD §5/§6 BR-08 — tabel TAUTAN/LINK ke Modul 10 (CAPA, BELUM ADA di
// codebase ini, task 4.2) — BUKAN tempat mendefinisikan action plan.
// DTO ini SENGAJA tidak mengekspos field detail (action_description/PIC/
// due_date apa pun) — BR-08 "sistem menolak penambahan field detail action
// plan langsung di tabel ini" TERPENUHI BY CONSTRUCTION (tidak ada jalur
// utk menulisnya sama sekali), bukan validasi runtime eksplisit.
@Injectable()
export class IncidentCorrectiveActionLinkService {
  constructor(private readonly prisma: PrismaService) {}

  async link(input: LinkIncidentCorrectiveActionInput): Promise<IncidentCorrectiveAction> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) =>
      tx.incidentCorrectiveAction.create({
        data: {
          tenantId,
          incidentReportId: input.incidentReportId,
          incidentInvestigationId: input.incidentInvestigationId,
          capaRegisterId: input.capaRegisterId,
          linkedBy: createdBy,
          linkedAt: new Date(),
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );
  }

  /** Modul 10 BELUM ADA — TIDAK ada event/listener sungguhan yang memanggil
   * ini (gap TDD §26, pola sama incident_corrective_actions.capa_register_id
   * bare UUID tanpa FK) — method disediakan sbg titik sinkronisasi masa
   * depan begitu Modul 10 dibangun. */
  async updateCapaStatusCache(incidentCorrectiveActionId: string, capaStatusCache: string): Promise<IncidentCorrectiveAction> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.incidentCorrectiveAction.update({ where: { id: incidentCorrectiveActionId }, data: { capaStatusCache, updatedBy } }),
    );
  }

  async listByReport(incidentReportId: string): Promise<IncidentCorrectiveAction[]> {
    return this.prisma.withRls((tx) => tx.incidentCorrectiveAction.findMany({ where: { incidentReportId }, orderBy: { linkedAt: "desc" } }));
  }
}
