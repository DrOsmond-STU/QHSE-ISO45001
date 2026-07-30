import { validateInspectionRecordStatusTransition } from "./inspection-lifecycle";

describe("validateInspectionRecordStatusTransition", () => {
  it("mengizinkan SCHEDULED->IN_PROGRESS->COMPLETED", () => {
    expect(() => validateInspectionRecordStatusTransition("SCHEDULED", "IN_PROGRESS")).not.toThrow();
    expect(() => validateInspectionRecordStatusTransition("IN_PROGRESS", "COMPLETED")).not.toThrow();
  });

  it("mengizinkan SCHEDULED/IN_PROGRESS->OVERDUE, lalu OVERDUE->IN_PROGRESS/COMPLETED", () => {
    expect(() => validateInspectionRecordStatusTransition("SCHEDULED", "OVERDUE")).not.toThrow();
    expect(() => validateInspectionRecordStatusTransition("IN_PROGRESS", "OVERDUE")).not.toThrow();
    expect(() => validateInspectionRecordStatusTransition("OVERDUE", "IN_PROGRESS")).not.toThrow();
    expect(() => validateInspectionRecordStatusTransition("OVERDUE", "COMPLETED")).not.toThrow();
  });

  it("mengizinkan COMPLETED->IN_PROGRESS (BR-03 reopen HSE Manager)", () => {
    expect(() => validateInspectionRecordStatusTransition("COMPLETED", "IN_PROGRESS")).not.toThrow();
  });

  it("menolak COMPLETED->COMPLETED dan transisi dari CANCELLED (terminal)", () => {
    expect(() => validateInspectionRecordStatusTransition("COMPLETED", "COMPLETED")).toThrow();
    expect(() => validateInspectionRecordStatusTransition("CANCELLED", "IN_PROGRESS")).toThrow();
  });
});
