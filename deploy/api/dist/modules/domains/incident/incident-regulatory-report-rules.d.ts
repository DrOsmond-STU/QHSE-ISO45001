import { IncidentClassification, IncidentRegulatoryReportStatus } from "@prisma/client";
export declare const DEFAULT_REGULATORY_REPORT_TENGGAT_HOURS = 48;
export declare function shouldAutoCreateRegulatoryReport(classification: IncidentClassification): boolean;
export declare function computeRequiredByDate(incidentDatetime: Date): Date;
export declare function assertNoPendingOrOverdueRegulatoryReports(reports: {
    status: IncidentRegulatoryReportStatus;
}[]): void;
