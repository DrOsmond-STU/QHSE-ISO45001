import {
  assertControlsAdequateForActive,
  calculateSignificanceScore,
  deriveSignificanceLevel,
  validateAspectImpactStatusTransition,
} from "./aspect-impact-lifecycle";

describe("calculateSignificanceScore", () => {
  it("rata-rata terbobot sama rata (default 0.2 masing²)", () => {
    expect(
      calculateSignificanceScore({
        likelihoodScore: 5,
        severityScore: 5,
        frequencyScore: 5,
        regulatoryScore: 5,
        stakeholderConcernScore: 5,
      }),
    ).toBe(5);
  });

  it("skor campuran dihitung benar", () => {
    expect(
      calculateSignificanceScore({
        likelihoodScore: 3,
        severityScore: 4,
        frequencyScore: 2,
        regulatoryScore: 5,
        stakeholderConcernScore: 1,
      }),
    ).toBe(3);
  });

  it("bobot custom yang total 1.0 diterima", () => {
    const score = calculateSignificanceScore(
      { likelihoodScore: 5, severityScore: 1, frequencyScore: 1, regulatoryScore: 1, stakeholderConcernScore: 1 },
      { likelihood: 0.6, severity: 0.1, frequency: 0.1, regulatory: 0.1, stakeholderConcern: 0.1 },
    );
    expect(score).toBe(3.4);
  });

  it("bobot custom yang total BUKAN 1.0 ditolak", () => {
    expect(() =>
      calculateSignificanceScore(
        { likelihoodScore: 5, severityScore: 5, frequencyScore: 5, regulatoryScore: 5, stakeholderConcernScore: 5 },
        { likelihood: 0.5, severity: 0.5 },
      ),
    ).toThrow(/Total bobot/);
  });
});

describe("deriveSignificanceLevel", () => {
  it("SIGNIFICANT jika skor >= threshold", () => {
    expect(deriveSignificanceLevel(4, 4)).toBe("SIGNIFICANT");
    expect(deriveSignificanceLevel(4.5, 4)).toBe("SIGNIFICANT");
  });

  it("NOT_SIGNIFICANT jika skor < threshold", () => {
    expect(deriveSignificanceLevel(3.9, 4)).toBe("NOT_SIGNIFICANT");
  });
});

describe("assertControlsAdequateForActive (BR-01)", () => {
  it("lolos jika NOT_SIGNIFICANT tanpa controls/capa", () => {
    expect(() => assertControlsAdequateForActive("NOT_SIGNIFICANT", null, null)).not.toThrow();
  });

  it("SIGNIFICANT tanpa existing_controls maupun capa_id ditolak", () => {
    expect(() => assertControlsAdequateForActive("SIGNIFICANT", null, null)).toThrow(/BR-01/);
  });

  it("SIGNIFICANT dgn existing_controls terisi lolos", () => {
    expect(() => assertControlsAdequateForActive("SIGNIFICANT", "Filter udara terpasang", null)).not.toThrow();
  });

  it("SIGNIFICANT dgn capa_id terisi lolos", () => {
    expect(() => assertControlsAdequateForActive("SIGNIFICANT", null, "capa-uuid")).not.toThrow();
  });
});

describe("validateAspectImpactStatusTransition", () => {
  it("DRAFT->UNDER_REVIEW valid", () => {
    expect(() => validateAspectImpactStatusTransition("DRAFT", "UNDER_REVIEW")).not.toThrow();
  });

  it("UNDER_REVIEW->ACTIVE valid", () => {
    expect(() => validateAspectImpactStatusTransition("UNDER_REVIEW", "ACTIVE")).not.toThrow();
  });

  it("ACTIVE->UNDER_REVIEW valid (review tahunan)", () => {
    expect(() => validateAspectImpactStatusTransition("ACTIVE", "UNDER_REVIEW")).not.toThrow();
  });

  it("ARCHIVED->apa pun ditolak (status terminal)", () => {
    expect(() => validateAspectImpactStatusTransition("ARCHIVED", "DRAFT")).toThrow(/tidak valid/);
  });

  it("DRAFT->ACTIVE langsung ditolak (wajib lewat UNDER_REVIEW)", () => {
    expect(() => validateAspectImpactStatusTransition("DRAFT", "ACTIVE")).toThrow(/tidak valid/);
  });
});
