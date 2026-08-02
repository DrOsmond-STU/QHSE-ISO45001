import { IncidentClassification, IncidentInvestigationStatus } from "@prisma/client";
export declare function assertInvestigationApprovedIfRequiredForClosure(classification: IncidentClassification, latestInvestigationStatus: IncidentInvestigationStatus | null): void;
