import { validateIncidentReportStatusTransition } from "./incident-lifecycle";

describe("validateIncidentReportStatusTransition", () => {
  it("mengizinkan alur penuh REPORTED->UNDER_VERIFICATION->UNDER_INVESTIGATION->INVESTIGATION_COMPLETED->PENDING_REGULATORY_REPORT->CLOSED", () => {
    expect(() => validateIncidentReportStatusTransition("REPORTED", "UNDER_VERIFICATION")).not.toThrow();
    expect(() => validateIncidentReportStatusTransition("UNDER_VERIFICATION", "UNDER_INVESTIGATION")).not.toThrow();
    expect(() => validateIncidentReportStatusTransition("UNDER_INVESTIGATION", "INVESTIGATION_COMPLETED")).not.toThrow();
    expect(() => validateIncidentReportStatusTransition("INVESTIGATION_COMPLETED", "PENDING_REGULATORY_REPORT")).not.toThrow();
    expect(() => validateIncidentReportStatusTransition("PENDING_REGULATORY_REPORT", "CLOSED")).not.toThrow();
  });

  it("mengizinkan jalur pintas insiden ringan UNDER_VERIFICATION->CLOSED (tanpa investigasi formal)", () => {
    expect(() => validateIncidentReportStatusTransition("UNDER_VERIFICATION", "CLOSED")).not.toThrow();
  });

  it("mengizinkan INVESTIGATION_COMPLETED->CLOSED langsung (tanpa regulatory report)", () => {
    expect(() => validateIncidentReportStatusTransition("INVESTIGATION_COMPLETED", "CLOSED")).not.toThrow();
  });

  it("mengizinkan CLOSED->REOPENED->UNDER_INVESTIGATION", () => {
    expect(() => validateIncidentReportStatusTransition("CLOSED", "REOPENED")).not.toThrow();
    expect(() => validateIncidentReportStatusTransition("REOPENED", "UNDER_INVESTIGATION")).not.toThrow();
  });

  it("menolak transisi tidak valid", () => {
    expect(() => validateIncidentReportStatusTransition("REPORTED", "CLOSED")).toThrow();
    expect(() => validateIncidentReportStatusTransition("CLOSED", "UNDER_INVESTIGATION")).toThrow();
    expect(() => validateIncidentReportStatusTransition("UNDER_INVESTIGATION", "CLOSED")).toThrow();
  });
});
