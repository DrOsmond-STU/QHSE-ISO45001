import { assertAllMandatoryItemsAnswered } from "./inspection-mandatory-items";

describe("assertAllMandatoryItemsAnswered (BR-01)", () => {
  const templateItems = [
    { id: "t1", isMandatory: true },
    { id: "t2", isMandatory: true },
    { id: "t3", isMandatory: false },
  ];

  it("lolos kalau seluruh item mandatory terjawab (item opsional boleh kosong)", () => {
    expect(() => assertAllMandatoryItemsAnswered(templateItems, [{ templateItemId: "t1" }, { templateItemId: "t2" }])).not.toThrow();
  });

  it("throw kalau ada item mandatory belum terjawab", () => {
    expect(() => assertAllMandatoryItemsAnswered(templateItems, [{ templateItemId: "t1" }])).toThrow(/BR-01/);
  });

  it("throw kalau TIDAK ADA item terjawab sama sekali", () => {
    expect(() => assertAllMandatoryItemsAnswered(templateItems, [])).toThrow();
  });
});
