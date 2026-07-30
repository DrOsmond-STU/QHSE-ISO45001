import { ErtRole } from "@prisma/client";

// BR-03 — "emergency_response_team_members.ert_role=INCIDENT_COMMANDER
// wajib UNIK per emergency_response_team_id AKTIF, kecuali sebagai
// backup_for_member_id eksplisit." Caller menyaring existingMembers ke
// status=ACTIVE pada team yang SAMA sebelum memanggil fungsi ini — fungsi
// murni ini hanya mengevaluasi aturan keunikannya.
export interface ExistingTeamMemberForUniquenessCheck {
  ertRole: ErtRole;
  backupForMemberId: string | null;
}

export interface CandidateTeamMember {
  ertRole: ErtRole;
  backupForMemberId?: string | null;
}

export function assertIncidentCommanderUniquePerActiveTeam(
  existingActiveMembers: ExistingTeamMemberForUniquenessCheck[],
  candidate: CandidateTeamMember,
): void {
  if (candidate.ertRole !== "INCIDENT_COMMANDER") return;
  // Kandidat sendiri ditandai sbg backup EKSPLISIT (backup_for_member_id
  // terisi) -> dikecualikan dari gate keunikan, PERSIS teks BR-03.
  if (candidate.backupForMemberId) return;

  const existingPrimaryIncidentCommander = existingActiveMembers.some(
    (m) => m.ertRole === "INCIDENT_COMMANDER" && !m.backupForMemberId,
  );
  if (existingPrimaryIncidentCommander) {
    throw new Error(
      "emergency_response_team_members tidak dapat ditambahkan — ert_role=INCIDENT_COMMANDER (non-backup) sudah ada pada tim aktif ini (BR-03).",
    );
  }
}
