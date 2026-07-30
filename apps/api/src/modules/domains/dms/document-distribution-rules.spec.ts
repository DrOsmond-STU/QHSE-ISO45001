import { assertClassificationAllowsTarget, assertDocumentAcceptsNewDistribution } from "./document-distribution-rules";

describe("assertDocumentAcceptsNewDistribution (BR-05)", () => {
  it.each(["DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED", "UNDER_REVISION"] as const)("mengizinkan status %s", (status) => {
    expect(() => assertDocumentAcceptsNewDistribution(status)).not.toThrow();
  });

  it.each(["RETIRED", "OBSOLETE"] as const)("menolak status %s", (status) => {
    expect(() => assertDocumentAcceptsNewDistribution(status)).toThrow();
  });
});

describe("assertClassificationAllowsTarget (BR-07)", () => {
  it.each(["RESTRICTED", "CONFIDENTIAL"] as const)("%s hanya boleh ke USER/ROLE", (classification) => {
    expect(() => assertClassificationAllowsTarget(classification, "USER")).not.toThrow();
    expect(() => assertClassificationAllowsTarget(classification, "ROLE")).not.toThrow();
    expect(() => assertClassificationAllowsTarget(classification, "DEPARTMENT")).toThrow();
    expect(() => assertClassificationAllowsTarget(classification, "SITE")).toThrow();
    expect(() => assertClassificationAllowsTarget(classification, "COMPANY")).toThrow();
    expect(() => assertClassificationAllowsTarget(classification, "ALL_TENANT")).toThrow();
  });

  it.each(["PUBLIC", "INTERNAL"] as const)("%s boleh ke target apa pun termasuk ALL_TENANT", (classification) => {
    expect(() => assertClassificationAllowsTarget(classification, "ALL_TENANT")).not.toThrow();
    expect(() => assertClassificationAllowsTarget(classification, "USER")).not.toThrow();
  });
});
