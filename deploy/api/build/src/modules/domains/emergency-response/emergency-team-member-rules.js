"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertIncidentCommanderUniquePerActiveTeam = assertIncidentCommanderUniquePerActiveTeam;
function assertIncidentCommanderUniquePerActiveTeam(existingActiveMembers, candidate) {
    if (candidate.ertRole !== "INCIDENT_COMMANDER")
        return;
    // Kandidat sendiri ditandai sbg backup EKSPLISIT (backup_for_member_id
    // terisi) -> dikecualikan dari gate keunikan, PERSIS teks BR-03.
    if (candidate.backupForMemberId)
        return;
    const existingPrimaryIncidentCommander = existingActiveMembers.some((m) => m.ertRole === "INCIDENT_COMMANDER" && !m.backupForMemberId);
    if (existingPrimaryIncidentCommander) {
        throw new Error("emergency_response_team_members tidak dapat ditambahkan — ert_role=INCIDENT_COMMANDER (non-backup) sudah ada pada tim aktif ini (BR-03).");
    }
}
