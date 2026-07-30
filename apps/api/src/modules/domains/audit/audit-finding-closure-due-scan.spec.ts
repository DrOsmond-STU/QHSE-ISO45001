import { findFindingsClosureDue } from "./audit-finding-closure-due-scan";

const now = new Date("2026-07-25T00:00:00.000Z");

describe("findFindingsClosureDue", () => {
  it("kembalikan finding dalam jendela 7 hari mendatang", () => {
    const result = findFindingsClosureDue([{ auditFindingId: "f1", status: "OPEN", targetClosureDate: new Date("2026-07-30") }], now);
    expect(result).toHaveLength(1);
  });

  it("kembalikan finding yang SUDAH breach (target_closure_date lewat)", () => {
    const result = findFindingsClosureDue([{ auditFindingId: "f1", status: "OPEN", targetClosureDate: new Date("2026-07-01") }], now);
    expect(result).toHaveLength(1);
  });

  it("kecualikan finding CLOSED", () => {
    const result = findFindingsClosureDue([{ auditFindingId: "f1", status: "CLOSED", targetClosureDate: new Date("2026-07-01") }], now);
    expect(result).toHaveLength(0);
  });

  it("kecualikan finding targetClosureDate null (Observation/OFI tanpa tenggat)", () => {
    const result = findFindingsClosureDue([{ auditFindingId: "f1", status: "OPEN", targetClosureDate: null }], now);
    expect(result).toHaveLength(0);
  });

  it("kecualikan finding di luar jendela 7 hari", () => {
    const result = findFindingsClosureDue([{ auditFindingId: "f1", status: "OPEN", targetClosureDate: new Date("2026-09-01") }], now);
    expect(result).toHaveLength(0);
  });
});
