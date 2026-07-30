import { computeSeverityLevel } from "./incident-severity";

describe("computeSeverityLevel", () => {
  it("FATALITY -> CRITICAL", () => {
    expect(computeSeverityLevel("FATALITY")).toBe("CRITICAL");
  });

  it("PROCESS_SAFETY_EVENT dan LOST_TIME_INJURY -> HIGH", () => {
    expect(computeSeverityLevel("PROCESS_SAFETY_EVENT")).toBe("HIGH");
    expect(computeSeverityLevel("LOST_TIME_INJURY")).toBe("HIGH");
  });

  it("RESTRICTED_WORK_CASE, MEDICAL_TREATMENT, ENVIRONMENTAL_SPILL -> MEDIUM", () => {
    expect(computeSeverityLevel("RESTRICTED_WORK_CASE")).toBe("MEDIUM");
    expect(computeSeverityLevel("MEDICAL_TREATMENT")).toBe("MEDIUM");
    expect(computeSeverityLevel("ENVIRONMENTAL_SPILL")).toBe("MEDIUM");
  });

  it("NEAR_MISS, FIRST_AID, PROPERTY_DAMAGE -> LOW", () => {
    expect(computeSeverityLevel("NEAR_MISS")).toBe("LOW");
    expect(computeSeverityLevel("FIRST_AID")).toBe("LOW");
    expect(computeSeverityLevel("PROPERTY_DAMAGE")).toBe("LOW");
  });
});
