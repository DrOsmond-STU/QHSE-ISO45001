import { AuditTeamRole, AuditorCompetencyStatus } from "@prisma/client";
export interface CompetencyRecordForCheck {
    userId: string;
    standardScope: string;
    status: AuditorCompetencyStatus;
    expiryDate: Date | null;
}
export interface TeamMemberForCompetencyCheck {
    userId: string;
    roleInTeam: AuditTeamRole;
}
export declare function checkLeadAuditorCompetencyWarnings(teamMembers: TeamMemberForCompetencyCheck[], competencyRecords: CompetencyRecordForCheck[], standardCode: string, now: Date): string[];
