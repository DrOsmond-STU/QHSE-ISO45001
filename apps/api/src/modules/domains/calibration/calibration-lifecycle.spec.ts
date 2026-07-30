import {
  calculateDaysOverdue,
  calculateNextCalibrationDueDate,
  canCloseOutOfToleranceRecord,
  isCalibrationScheduleOverdue,
  isCapaRequiredAfterImpactAssessment,
  isCapaRequiredAtOotCreation,
  isCertificateReviewAllowedByAccreditation,
  isWithinReminderWindow,
  shouldAutoCreateOutOfToleranceRecord,
} from "./calibration-lifecycle";

describe("calculateNextCalibrationDueDate (BR-03)", () => {
  it("menambah calibration_interval_months ke calibration_date", () => {
    const result = calculateNextCalibrationDueDate(new Date("2026-01-15T00:00:00Z"), 12);
    expect(result.toISOString().slice(0, 10)).toBe("2027-01-15");
  });

  it("interval pendek (1 bulan) — overflow native Date saat hari sumber tidak ada di bulan tujuan", () => {
    // 2026 BUKAN tahun kabisat (28 hari Feb) — 31 Jan + 1 bulan overflow ke
    // 3 Mar (31-28=3), perilaku native JS Date setUTCMonth(), bukan bug.
    const result = calculateNextCalibrationDueDate(new Date("2026-01-31T00:00:00Z"), 1);
    expect(result.toISOString().slice(0, 10)).toBe("2026-03-03");
  });
});

describe("shouldAutoCreateOutOfToleranceRecord (BR-04)", () => {
  it("FAIL -> true", () => {
    expect(shouldAutoCreateOutOfToleranceRecord("FAIL")).toBe(true);
  });
  it("PASS -> false", () => {
    expect(shouldAutoCreateOutOfToleranceRecord("PASS")).toBe(false);
  });
  it("CONDITIONAL_PASS -> false", () => {
    expect(shouldAutoCreateOutOfToleranceRecord("CONDITIONAL_PASS")).toBe(false);
  });
});

describe("isCapaRequiredAtOotCreation (BR-06, saat create)", () => {
  it("is_critical_measurement=true -> true", () => {
    expect(isCapaRequiredAtOotCreation(true)).toBe(true);
  });
  it("is_critical_measurement=false -> false", () => {
    expect(isCapaRequiredAtOotCreation(false)).toBe(false);
  });
});

describe("isCapaRequiredAfterImpactAssessment (§4.2 poin 3, saat assessImpact)", () => {
  it("kritis TAPI impact null -> tetap true (kritis menang)", () => {
    expect(isCapaRequiredAfterImpactAssessment(true, null)).toBe(true);
  });
  it("tidak kritis + impact LOW -> false", () => {
    expect(isCapaRequiredAfterImpactAssessment(false, "LOW")).toBe(false);
  });
  it("tidak kritis + impact MEDIUM -> true", () => {
    expect(isCapaRequiredAfterImpactAssessment(false, "MEDIUM")).toBe(true);
  });
  it("tidak kritis + impact HIGH -> true", () => {
    expect(isCapaRequiredAfterImpactAssessment(false, "HIGH")).toBe(true);
  });
  it("tidak kritis + impact CRITICAL -> true", () => {
    expect(isCapaRequiredAfterImpactAssessment(false, "CRITICAL")).toBe(true);
  });
  it("tidak kritis + impact null -> false", () => {
    expect(isCapaRequiredAfterImpactAssessment(false, null)).toBe(false);
  });
});

describe("canCloseOutOfToleranceRecord (BR-07)", () => {
  it("requiresCapa=false -> selalu boleh close", () => {
    expect(canCloseOutOfToleranceRecord(false, null)).toBe(true);
  });
  it("requiresCapa=true + capaRegisterId kosong -> ditolak", () => {
    expect(canCloseOutOfToleranceRecord(true, null)).toBe(false);
  });
  it("requiresCapa=true + capaRegisterId terisi -> boleh", () => {
    expect(canCloseOutOfToleranceRecord(true, "capa-id-123")).toBe(true);
  });
});

describe("isCertificateReviewAllowedByAccreditation (BR-05)", () => {
  it("INTERNAL_LAB selalu diizinkan walau accreditationValidUntil null", () => {
    expect(isCertificateReviewAllowedByAccreditation("INTERNAL_LAB", null, new Date("2026-01-01"))).toBe(true);
  });
  it("EXTERNAL_LAB dgn accreditationValidUntil null -> fail-closed, ditolak", () => {
    expect(isCertificateReviewAllowedByAccreditation("EXTERNAL_LAB", null, new Date("2026-01-01"))).toBe(false);
  });
  it("EXTERNAL_LAB dgn akreditasi masih berlaku pada calibration_date -> diizinkan", () => {
    expect(
      isCertificateReviewAllowedByAccreditation("EXTERNAL_LAB", new Date("2027-01-01"), new Date("2026-06-01")),
    ).toBe(true);
  });
  it("EXTERNAL_LAB dgn akreditasi SUDAH lewat pada calibration_date -> ditolak", () => {
    expect(
      isCertificateReviewAllowedByAccreditation("EXTERNAL_LAB", new Date("2026-01-01"), new Date("2026-06-01")),
    ).toBe(false);
  });
  it("EXTERNAL_LAB dgn accreditationValidUntil TEPAT SAMA dgn calibration_date -> diizinkan (batas inklusif)", () => {
    expect(
      isCertificateReviewAllowedByAccreditation("EXTERNAL_LAB", new Date("2026-06-01"), new Date("2026-06-01")),
    ).toBe(true);
  });
});

describe("isWithinReminderWindow (H-30/14/7/1)", () => {
  const now = new Date("2026-06-01T00:00:00Z");

  it("due_date 30 hari lagi, window 30 -> true", () => {
    const dueDate = new Date("2026-07-01T00:00:00Z");
    expect(isWithinReminderWindow(dueDate, now, 30)).toBe(true);
  });
  it("due_date 31 hari lagi, window 30 -> false", () => {
    const dueDate = new Date("2026-07-02T00:00:00Z");
    expect(isWithinReminderWindow(dueDate, now, 30)).toBe(false);
  });
  it("due_date pas hari ini, window 1 -> true", () => {
    expect(isWithinReminderWindow(now, now, 1)).toBe(true);
  });
  it("due_date sudah lewat -> false (overdue punya jalur terpisah)", () => {
    const dueDate = new Date("2026-05-01T00:00:00Z");
    expect(isWithinReminderWindow(dueDate, now, 30)).toBe(false);
  });
});

describe("isCalibrationScheduleOverdue (BR-09)", () => {
  it("due_date sudah lewat -> true", () => {
    expect(isCalibrationScheduleOverdue(new Date("2026-01-01"), new Date("2026-02-01"))).toBe(true);
  });
  it("due_date belum lewat -> false", () => {
    expect(isCalibrationScheduleOverdue(new Date("2026-03-01"), new Date("2026-02-01"))).toBe(false);
  });
  it("due_date pas sekarang -> false (belum lewat, bukan strictly overdue)", () => {
    const now = new Date("2026-02-01T00:00:00Z");
    expect(isCalibrationScheduleOverdue(now, now)).toBe(false);
  });
});

describe("calculateDaysOverdue", () => {
  it("menghitung jumlah hari sejak due_date", () => {
    expect(calculateDaysOverdue(new Date("2026-01-01"), new Date("2026-01-08"))).toBe(7);
  });
  it("belum overdue -> 0 (bukan negatif)", () => {
    expect(calculateDaysOverdue(new Date("2026-02-01"), new Date("2026-01-01"))).toBe(0);
  });
});
