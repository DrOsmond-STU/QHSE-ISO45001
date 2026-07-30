import { assertLabReportAttachedBeforeVerified, calculateComplianceStatus, validateMonitoringRecordStatusTransition } from "./monitoring-rules";

describe("calculateComplianceStatus", () => {
  it("NOT_APPLICABLE jika kedua baku mutu null", () => {
    expect(calculateComplianceStatus(50, null, null)).toBe("NOT_APPLICABLE");
  });

  it("EXCEED jika di bawah baku_mutu_min", () => {
    expect(calculateComplianceStatus(2, 5, 10)).toBe("EXCEED");
  });

  it("EXCEED jika di atas baku_mutu_max", () => {
    expect(calculateComplianceStatus(15, 5, 10)).toBe("EXCEED");
  });

  it("COMPLIANT jika dalam rentang", () => {
    expect(calculateComplianceStatus(7, 5, 10)).toBe("COMPLIANT");
  });

  it("COMPLIANT jika tepat di batas min/max", () => {
    expect(calculateComplianceStatus(5, 5, 10)).toBe("COMPLIANT");
    expect(calculateComplianceStatus(10, 5, 10)).toBe("COMPLIANT");
  });

  it("hanya baku_mutu_max terisi (mis. parameter emisi tanpa batas bawah)", () => {
    expect(calculateComplianceStatus(3, null, 10)).toBe("COMPLIANT");
    expect(calculateComplianceStatus(11, null, 10)).toBe("EXCEED");
  });
});

describe("assertLabReportAttachedBeforeVerified (BR-07)", () => {
  it("lolos jika lampiran ada", () => {
    expect(() => assertLabReportAttachedBeforeVerified(true)).not.toThrow();
  });

  it("ditolak jika lampiran tidak ada", () => {
    expect(() => assertLabReportAttachedBeforeVerified(false)).toThrow(/BR-07/);
  });
});

describe("validateMonitoringRecordStatusTransition", () => {
  it("RECORDED->VERIFIED valid", () => {
    expect(() => validateMonitoringRecordStatusTransition("RECORDED", "VERIFIED")).not.toThrow();
  });

  it("VERIFIED->REPORTED_TO_REGULATOR valid", () => {
    expect(() => validateMonitoringRecordStatusTransition("VERIFIED", "REPORTED_TO_REGULATOR")).not.toThrow();
  });

  it("RECORDED->REPORTED_TO_REGULATOR langsung ditolak", () => {
    expect(() => validateMonitoringRecordStatusTransition("RECORDED", "REPORTED_TO_REGULATOR")).toThrow(/tidak valid/);
  });

  it("REPORTED_TO_REGULATOR->apa pun ditolak (status terminal)", () => {
    expect(() => validateMonitoringRecordStatusTransition("REPORTED_TO_REGULATOR", "VERIFIED")).toThrow(/tidak valid/);
  });
});
