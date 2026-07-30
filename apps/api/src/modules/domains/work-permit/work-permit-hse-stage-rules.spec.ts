import { computeHasHseStage } from "./work-permit-hse-stage-rules";

describe("computeHasHseStage — BR-04", () => {
  it("true kalau risk_level=HIGH, apa pun requiresHseApproval", () => {
    expect(computeHasHseStage("HIGH", false)).toBe(true);
    expect(computeHasHseStage("HIGH", true)).toBe(true);
  });

  it("true kalau requiresHseApproval=true, apa pun risk_level", () => {
    expect(computeHasHseStage("LOW", true)).toBe(true);
    expect(computeHasHseStage("MEDIUM", true)).toBe(true);
  });

  it("false kalau risk_level bukan HIGH DAN requiresHseApproval=false", () => {
    expect(computeHasHseStage("LOW", false)).toBe(false);
    expect(computeHasHseStage("MEDIUM", false)).toBe(false);
  });
});
