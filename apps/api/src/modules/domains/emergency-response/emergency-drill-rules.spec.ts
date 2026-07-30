import {
  assertActivationExistsIfFullScaleEvacuation,
  assertCapaLinkedIfGapsIdentified,
  validateEmergencyDrillStatusTransition,
} from "./emergency-drill-rules";

describe("validateEmergencyDrillStatusTransition", () => {
  it("mengizinkan PLANNED->IN_PROGRESS->COMPLETED", () => {
    expect(() => validateEmergencyDrillStatusTransition("PLANNED", "IN_PROGRESS")).not.toThrow();
    expect(() => validateEmergencyDrillStatusTransition("IN_PROGRESS", "COMPLETED")).not.toThrow();
  });

  it("mengizinkan pembatalan dari PLANNED maupun IN_PROGRESS", () => {
    expect(() => validateEmergencyDrillStatusTransition("PLANNED", "CANCELLED")).not.toThrow();
    expect(() => validateEmergencyDrillStatusTransition("IN_PROGRESS", "CANCELLED")).not.toThrow();
  });

  it("menolak PLANNED->COMPLETED langsung", () => {
    expect(() => validateEmergencyDrillStatusTransition("PLANNED", "COMPLETED")).toThrow(/tidak valid/);
  });

  it("menolak transisi apa pun dari status terminal COMPLETED/CANCELLED", () => {
    expect(() => validateEmergencyDrillStatusTransition("COMPLETED", "IN_PROGRESS")).toThrow();
    expect(() => validateEmergencyDrillStatusTransition("CANCELLED", "PLANNED")).toThrow();
  });
});

describe("assertActivationExistsIfFullScaleEvacuation (BR-04)", () => {
  it("tidak throw utk TABLETOP/FUNCTIONAL berapa pun activationCount-nya", () => {
    expect(() => assertActivationExistsIfFullScaleEvacuation("TABLETOP", 0)).not.toThrow();
    expect(() => assertActivationExistsIfFullScaleEvacuation("FUNCTIONAL", 0)).not.toThrow();
  });

  it("throw utk FULL_SCALE_EVACUATION tanpa activation sama sekali", () => {
    expect(() => assertActivationExistsIfFullScaleEvacuation("FULL_SCALE_EVACUATION", 0)).toThrow(/BR-04/);
  });

  it("tidak throw utk FULL_SCALE_EVACUATION dgn minimal 1 activation", () => {
    expect(() => assertActivationExistsIfFullScaleEvacuation("FULL_SCALE_EVACUATION", 1)).not.toThrow();
  });
});

describe("assertCapaLinkedIfGapsIdentified (BR-08)", () => {
  it("tidak throw kalau gapsIdentified kosong/null", () => {
    expect(() => assertCapaLinkedIfGapsIdentified(null, null)).not.toThrow();
    expect(() => assertCapaLinkedIfGapsIdentified("", null)).not.toThrow();
    expect(() => assertCapaLinkedIfGapsIdentified("   ", null)).not.toThrow();
  });

  it("throw kalau gapsIdentified terisi tapi capaId kosong", () => {
    expect(() => assertCapaLinkedIfGapsIdentified("Evakuasi terlalu lambat", null)).toThrow(/BR-08/);
  });

  it("tidak throw kalau gapsIdentified terisi DAN capaId terisi", () => {
    expect(() => assertCapaLinkedIfGapsIdentified("Evakuasi terlalu lambat", "11111111-1111-1111-1111-111111111111")).not.toThrow();
  });
});
