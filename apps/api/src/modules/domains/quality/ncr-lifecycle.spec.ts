import { assertCapaRequiredBeforeClose, assertReInspectionPassedBeforeClose, resolveReInspectionRequired, validateNcrStatusTransition } from "./ncr-lifecycle";

describe("validateNcrStatusTransition", () => {
  it("mengizinkan alur penuh OPEN->CONTAINMENT->DISPOSITION_PENDING->DISPOSITIONED->CAPA_LINKED->CLOSED", () => {
    expect(() => validateNcrStatusTransition("OPEN", "CONTAINMENT")).not.toThrow();
    expect(() => validateNcrStatusTransition("CONTAINMENT", "DISPOSITION_PENDING")).not.toThrow();
    expect(() => validateNcrStatusTransition("DISPOSITION_PENDING", "DISPOSITIONED")).not.toThrow();
    expect(() => validateNcrStatusTransition("DISPOSITIONED", "CAPA_LINKED")).not.toThrow();
    expect(() => validateNcrStatusTransition("CAPA_LINKED", "CLOSED")).not.toThrow();
  });

  it("mengizinkan DISPOSITIONED langsung ke CLOSED (severity MINOR, tanpa CAPA)", () => {
    expect(() => validateNcrStatusTransition("DISPOSITIONED", "CLOSED")).not.toThrow();
  });

  it("menolak transisi dari status terminal CLOSED", () => {
    expect(() => validateNcrStatusTransition("CLOSED", "OPEN")).toThrow(/tidak valid/);
  });

  it("menolak lompat OPEN langsung ke DISPOSITIONED", () => {
    expect(() => validateNcrStatusTransition("OPEN", "DISPOSITIONED")).toThrow(/tidak valid/);
  });
});

describe("assertCapaRequiredBeforeClose (BR-01)", () => {
  it("menolak CLOSED severity MAJOR tanpa capa_id", () => {
    expect(() => assertCapaRequiredBeforeClose("MAJOR", null)).toThrow(/BR-01/);
  });

  it("menolak CLOSED severity CRITICAL tanpa capa_id", () => {
    expect(() => assertCapaRequiredBeforeClose("CRITICAL", null)).toThrow(/BR-01/);
  });

  it("mengizinkan CLOSED severity MAJOR dengan capa_id terisi", () => {
    expect(() => assertCapaRequiredBeforeClose("MAJOR", "capa-1")).not.toThrow();
  });

  it("mengizinkan CLOSED severity MINOR tanpa capa_id", () => {
    expect(() => assertCapaRequiredBeforeClose("MINOR", null)).not.toThrow();
  });
});

describe("assertReInspectionPassedBeforeClose (BR-07)", () => {
  it("menolak CLOSED disposition REWORK tanpa re_inspection_result=PASS", () => {
    expect(() => assertReInspectionPassedBeforeClose("REWORK", "NOT_YET")).toThrow(/BR-07/);
    expect(() => assertReInspectionPassedBeforeClose("REWORK", null)).toThrow(/BR-07/);
    expect(() => assertReInspectionPassedBeforeClose("REWORK", "FAIL")).toThrow(/BR-07/);
  });

  it("mengizinkan CLOSED disposition REWORK dengan re_inspection_result=PASS", () => {
    expect(() => assertReInspectionPassedBeforeClose("REWORK", "PASS")).not.toThrow();
  });

  it("mengizinkan CLOSED disposition USE_AS_IS tanpa re_inspection_result", () => {
    expect(() => assertReInspectionPassedBeforeClose("USE_AS_IS", null)).not.toThrow();
  });
});

describe("resolveReInspectionRequired", () => {
  it("TRUE utk REWORK/REPAIR", () => {
    expect(resolveReInspectionRequired("REWORK")).toBe(true);
    expect(resolveReInspectionRequired("REPAIR")).toBe(true);
  });

  it("FALSE utk disposition lain", () => {
    expect(resolveReInspectionRequired("USE_AS_IS")).toBe(false);
    expect(resolveReInspectionRequired("SCRAP")).toBe(false);
  });
});
