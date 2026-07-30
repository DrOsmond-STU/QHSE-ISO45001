import {
  assertOverrideJustificationRequired,
  calculateComplianceScorePercentage,
  deriveProperRating,
  validateProperSubmissionStatusTransition,
} from "./proper-assessment-rules";

describe("calculateComplianceScorePercentage", () => {
  it("array kosong -> 0", () => {
    expect(calculateComplianceScorePercentage([])).toBe(0);
  });

  it("satu kriteria -> skor kriteria itu sendiri", () => {
    expect(calculateComplianceScorePercentage([{ scoreValue: 75, weightPercentage: 100 }])).toBe(75);
  });

  it("rata-rata terbobot dari beberapa kriteria", () => {
    const score = calculateComplianceScorePercentage([
      { scoreValue: 100, weightPercentage: 50 },
      { scoreValue: 0, weightPercentage: 50 },
    ]);
    expect(score).toBe(50);
  });

  it("bobot tidak sama rata dihitung proporsional", () => {
    const score = calculateComplianceScorePercentage([
      { scoreValue: 100, weightPercentage: 80 },
      { scoreValue: 0, weightPercentage: 20 },
    ]);
    expect(score).toBe(80);
  });
});

describe("deriveProperRating", () => {
  it("HITAM di bawah 20%", () => {
    expect(deriveProperRating(10)).toBe("HITAM");
  });
  it("MERAH 20-40%", () => {
    expect(deriveProperRating(30)).toBe("MERAH");
  });
  it("BIRU 40-60%", () => {
    expect(deriveProperRating(50)).toBe("BIRU");
  });
  it("HIJAU 60-80%", () => {
    expect(deriveProperRating(70)).toBe("HIJAU");
  });
  it("EMAS 80% ke atas", () => {
    expect(deriveProperRating(95)).toBe("EMAS");
    expect(deriveProperRating(100)).toBe("EMAS");
  });
});

describe("assertOverrideJustificationRequired (BR-06)", () => {
  it("bukan override -> lolos tanpa justification", () => {
    expect(() => assertOverrideJustificationRequired(false, null)).not.toThrow();
  });

  it("override tanpa justification ditolak", () => {
    expect(() => assertOverrideJustificationRequired(true, null)).toThrow(/BR-06/);
  });

  it("override dengan justification lolos", () => {
    expect(() => assertOverrideJustificationRequired(true, "Data sampling lab terbaru belum masuk sistem")).not.toThrow();
  });
});

describe("validateProperSubmissionStatusTransition", () => {
  it("siklus penuh DRAFT->INTERNAL_REVIEWED->SUBMITTED_TO_KLHK->RESULT_RECEIVED valid", () => {
    expect(() => validateProperSubmissionStatusTransition("DRAFT", "INTERNAL_REVIEWED")).not.toThrow();
    expect(() => validateProperSubmissionStatusTransition("INTERNAL_REVIEWED", "SUBMITTED_TO_KLHK")).not.toThrow();
    expect(() => validateProperSubmissionStatusTransition("SUBMITTED_TO_KLHK", "RESULT_RECEIVED")).not.toThrow();
  });

  it("INTERNAL_REVIEWED->DRAFT valid (dikembalikan utk revisi)", () => {
    expect(() => validateProperSubmissionStatusTransition("INTERNAL_REVIEWED", "DRAFT")).not.toThrow();
  });

  it("RESULT_RECEIVED bersifat terminal", () => {
    expect(() => validateProperSubmissionStatusTransition("RESULT_RECEIVED", "DRAFT")).toThrow(/tidak valid/);
  });

  it("DRAFT->SUBMITTED_TO_KLHK langsung ditolak", () => {
    expect(() => validateProperSubmissionStatusTransition("DRAFT", "SUBMITTED_TO_KLHK")).toThrow(/tidak valid/);
  });
});
