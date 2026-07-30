import { assertIncidentCommanderUniquePerActiveTeam } from "./emergency-team-member-rules";

describe("assertIncidentCommanderUniquePerActiveTeam (BR-03)", () => {
  it("tidak throw kalau kandidat BUKAN INCIDENT_COMMANDER", () => {
    expect(() => assertIncidentCommanderUniquePerActiveTeam([], { ertRole: "FIRE_WARDEN" })).not.toThrow();
  });

  it("tidak throw kalau tim belum py Incident Commander sama sekali", () => {
    expect(() =>
      assertIncidentCommanderUniquePerActiveTeam(
        [{ ertRole: "FIRE_WARDEN", backupForMemberId: null }],
        { ertRole: "INCIDENT_COMMANDER" },
      ),
    ).not.toThrow();
  });

  it("throw kalau tim SUDAH py Incident Commander non-backup aktif", () => {
    expect(() =>
      assertIncidentCommanderUniquePerActiveTeam(
        [{ ertRole: "INCIDENT_COMMANDER", backupForMemberId: null }],
        { ertRole: "INCIDENT_COMMANDER" },
      ),
    ).toThrow(/BR-03/);
  });

  it("tidak throw kalau kandidat sendiri ditandai backup_for_member_id eksplisit (pengecualian literal BR-03)", () => {
    expect(() =>
      assertIncidentCommanderUniquePerActiveTeam(
        [{ ertRole: "INCIDENT_COMMANDER", backupForMemberId: null }],
        { ertRole: "INCIDENT_COMMANDER", backupForMemberId: "11111111-1111-1111-1111-111111111111" },
      ),
    ).not.toThrow();
  });

  it("tidak throw kalau Incident Commander YANG ADA berstatus backup (bukan primary)", () => {
    expect(() =>
      assertIncidentCommanderUniquePerActiveTeam(
        [{ ertRole: "INCIDENT_COMMANDER", backupForMemberId: "22222222-2222-2222-2222-222222222222" }],
        { ertRole: "INCIDENT_COMMANDER" },
      ),
    ).not.toThrow();
  });
});
