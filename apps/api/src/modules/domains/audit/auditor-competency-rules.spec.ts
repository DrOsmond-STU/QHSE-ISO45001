import { checkLeadAuditorCompetencyWarnings } from "./auditor-competency-rules";

describe("checkLeadAuditorCompetencyWarnings (BR-01)", () => {
  const now = new Date("2026-07-25T00:00:00.000Z");

  it("kembalikan array kosong kalau tidak ada LEAD_AUDITOR di tim", () => {
    const warnings = checkLeadAuditorCompetencyWarnings(
      [{ userId: "u1", roleInTeam: "AUDITOR" }],
      [],
      "ISO45001",
      now,
    );
    expect(warnings).toEqual([]);
  });

  it("kembalikan array kosong kalau Lead Auditor punya competency ACTIVE cocok standard_scope", () => {
    const warnings = checkLeadAuditorCompetencyWarnings(
      [{ userId: "u1", roleInTeam: "LEAD_AUDITOR" }],
      [{ userId: "u1", standardScope: "ISO45001", status: "ACTIVE", expiryDate: null }],
      "ISO45001",
      now,
    );
    expect(warnings).toEqual([]);
  });

  it("kembalikan 1 warning (TIDAK throw) kalau Lead Auditor tidak punya competency record sama sekali", () => {
    const warnings = checkLeadAuditorCompetencyWarnings(
      [{ userId: "u1", roleInTeam: "LEAD_AUDITOR" }],
      [],
      "ISO45001",
      now,
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/BR-01/);
  });

  it("warning kalau competency ada tapi standard_scope BEDA", () => {
    const warnings = checkLeadAuditorCompetencyWarnings(
      [{ userId: "u1", roleInTeam: "LEAD_AUDITOR" }],
      [{ userId: "u1", standardScope: "ISO9001", status: "ACTIVE", expiryDate: null }],
      "ISO45001",
      now,
    );
    expect(warnings).toHaveLength(1);
  });

  it("warning kalau competency berstatus EXPIRED", () => {
    const warnings = checkLeadAuditorCompetencyWarnings(
      [{ userId: "u1", roleInTeam: "LEAD_AUDITOR" }],
      [{ userId: "u1", standardScope: "ISO45001", status: "EXPIRED", expiryDate: null }],
      "ISO45001",
      now,
    );
    expect(warnings).toHaveLength(1);
  });

  it("warning kalau expiryDate sudah lewat now meski status masih ACTIVE di DB", () => {
    const warnings = checkLeadAuditorCompetencyWarnings(
      [{ userId: "u1", roleInTeam: "LEAD_AUDITOR" }],
      [{ userId: "u1", standardScope: "ISO45001", status: "ACTIVE", expiryDate: new Date("2026-01-01") }],
      "ISO45001",
      now,
    );
    expect(warnings).toHaveLength(1);
  });

  it("2 Lead Auditor, 1 qualified 1 tidak -> 1 warning saja", () => {
    const warnings = checkLeadAuditorCompetencyWarnings(
      [
        { userId: "u1", roleInTeam: "LEAD_AUDITOR" },
        { userId: "u2", roleInTeam: "LEAD_AUDITOR" },
      ],
      [{ userId: "u1", standardScope: "ISO45001", status: "ACTIVE", expiryDate: null }],
      "ISO45001",
      now,
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("u2");
  });
});
