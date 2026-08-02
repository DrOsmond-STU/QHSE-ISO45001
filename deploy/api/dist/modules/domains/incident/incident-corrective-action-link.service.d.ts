import { IncidentCorrectiveAction } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface LinkIncidentCorrectiveActionInput {
    incidentReportId: string;
    incidentInvestigationId?: string;
    capaRegisterId: string;
}
export declare class IncidentCorrectiveActionLinkService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    link(input: LinkIncidentCorrectiveActionInput): Promise<IncidentCorrectiveAction>;
    /** Modul 10 BELUM ADA — TIDAK ada event/listener sungguhan yang memanggil
     * ini (gap TDD §26, pola sama incident_corrective_actions.capa_register_id
     * bare UUID tanpa FK) — method disediakan sbg titik sinkronisasi masa
     * depan begitu Modul 10 dibangun. */
    updateCapaStatusCache(incidentCorrectiveActionId: string, capaStatusCache: string): Promise<IncidentCorrectiveAction>;
    listByReport(incidentReportId: string): Promise<IncidentCorrectiveAction[]>;
}
