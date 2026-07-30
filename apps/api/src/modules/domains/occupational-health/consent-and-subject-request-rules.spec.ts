import { canProcessErasureRequest, DEFAULT_MEDICAL_RECORD_MINIMUM_RETENTION_DAYS } from "./consent-and-subject-request-rules";

describe("canProcessErasureRequest (BR-06)", () => {
  it("ditolak jika retensi minimum belum terlampaui", () => {
    const result = canProcessErasureRequest({
      lastRecordActivityDate: new Date("2026-01-01"),
      requestDate: new Date("2026-07-26"),
    });
    expect(result.eligible).toBe(false);
    expect(result.rejectionReason).toMatch(/Retensi hukum minimum/);
  });

  it("diterima jika retensi minimum default (5 tahun) sudah terlampaui", () => {
    const result = canProcessErasureRequest({
      lastRecordActivityDate: new Date("2018-01-01"),
      requestDate: new Date("2026-07-26"),
    });
    expect(result.eligible).toBe(true);
    expect(result.rejectionReason).toBeUndefined();
  });

  it("tepat di batas retensi minimum default -> diterima", () => {
    const lastActivity = new Date("2026-01-01T00:00:00.000Z");
    const requestDate = new Date(lastActivity.getTime() + DEFAULT_MEDICAL_RECORD_MINIMUM_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const result = canProcessErasureRequest({ lastRecordActivityDate: lastActivity, requestDate });
    expect(result.eligible).toBe(true);
  });

  it("menghormati minimumRetentionDays override eksplisit (mis. kasus PAK)", () => {
    const result = canProcessErasureRequest({
      lastRecordActivityDate: new Date("2020-01-01"),
      requestDate: new Date("2026-07-26"),
      minimumRetentionDays: 365 * 30,
    });
    expect(result.eligible).toBe(false);
  });
});
