import { IncidentRegulatoryReport } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export declare class IncidentRegulatoryReportService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    submit(incidentRegulatoryReportId: string, officialReferenceNumber?: string): Promise<IncidentRegulatoryReport>;
    acknowledge(incidentRegulatoryReportId: string): Promise<IncidentRegulatoryReport>;
    listByReport(incidentReportId: string): Promise<IncidentRegulatoryReport[]>;
}
