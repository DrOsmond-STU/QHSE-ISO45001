import { calculateLtifr, calculateSeverityRate, calculateTrir, IncidentRateInput } from "./incident-statistics-formulas";

const BASE_INPUT: IncidentRateInput = {
  ltiCount: 2,
  restrictedWorkCount: 1,
  medicalTreatmentCount: 3,
  totalDaysLost: 40,
  totalManhoursWorked: 500_000,
  rateBaseHoursUsed: 1_000_000,
};

describe("calculateLtifr", () => {
  it("(ltiCount * rateBaseHoursUsed) / totalManhoursWorked", () => {
    expect(calculateLtifr(BASE_INPUT)).toBeCloseTo((2 * 1_000_000) / 500_000);
  });

  it("totalManhoursWorked=0 -> 0 (bukan NaN/Infinity)", () => {
    expect(calculateLtifr({ ...BASE_INPUT, totalManhoursWorked: 0 })).toBe(0);
  });
});

describe("calculateTrir", () => {
  it("((ltiCount+restrictedWorkCount+medicalTreatmentCount) * rateBaseHoursUsed) / totalManhoursWorked — TIDAK menghitung fatality (literal PRD)", () => {
    expect(calculateTrir(BASE_INPUT)).toBeCloseTo(((2 + 1 + 3) * 1_000_000) / 500_000);
  });

  it("totalManhoursWorked=0 -> 0", () => {
    expect(calculateTrir({ ...BASE_INPUT, totalManhoursWorked: 0 })).toBe(0);
  });
});

describe("calculateSeverityRate", () => {
  it("(totalDaysLost * rateBaseHoursUsed) / totalManhoursWorked", () => {
    expect(calculateSeverityRate(BASE_INPUT)).toBeCloseTo((40 * 1_000_000) / 500_000);
  });

  it("totalManhoursWorked=0 -> 0", () => {
    expect(calculateSeverityRate({ ...BASE_INPUT, totalManhoursWorked: 0 })).toBe(0);
  });
});
