import { ErtRole } from "@prisma/client";
export interface ExistingTeamMemberForUniquenessCheck {
    ertRole: ErtRole;
    backupForMemberId: string | null;
}
export interface CandidateTeamMember {
    ertRole: ErtRole;
    backupForMemberId?: string | null;
}
export declare function assertIncidentCommanderUniquePerActiveTeam(existingActiveMembers: ExistingTeamMemberForUniquenessCheck[], candidate: CandidateTeamMember): void;
