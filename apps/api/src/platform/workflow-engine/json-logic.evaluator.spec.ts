import { evaluateCondition } from "./json-logic.evaluator";

describe("evaluateCondition", () => {
  it("condition null/undefined selalu match (transisi tanpa syarat)", () => {
    expect(evaluateCondition(null, {})).toBe(true);
    expect(evaluateCondition(undefined, {})).toBe(true);
  });

  it("contoh literal TDD §9: {\"==\":[{\"var\":\"risk_level\"},\"HIGH\"]}", () => {
    const condition = { "==": [{ var: "risk_level" }, "HIGH"] };
    expect(evaluateCondition(condition, { risk_level: "HIGH" })).toBe(true);
    expect(evaluateCondition(condition, { risk_level: "LOW" })).toBe(false);
  });

  it("mendukung operator and/or kombinasi", () => {
    const condition = {
      and: [{ "==": [{ var: "risk_level" }, "HIGH"] }, { ">": [{ var: "estimated_cost" }, 1000] }],
    };
    expect(evaluateCondition(condition, { risk_level: "HIGH", estimated_cost: 5000 })).toBe(true);
    expect(evaluateCondition(condition, { risk_level: "HIGH", estimated_cost: 500 })).toBe(false);
  });

  it("field yang tidak ada di contextData dianggap undefined, bukan error", () => {
    const condition = { "==": [{ var: "field_yang_tidak_ada" }, "X"] };
    expect(() => evaluateCondition(condition, {})).not.toThrow();
    expect(evaluateCondition(condition, {})).toBe(false);
  });

  it("tidak pernah eksekusi kode arbitrer — condition berbahaya diperlakukan sebagai data, bukan kode", () => {
    // "condition" ini secara struktural bukan JSON Logic yang valid (bukan
    // objek {op: args}) — json-logic-js memperlakukannya sebagai literal,
    // TIDAK mengeksekusinya sebagai JS.
    const notAnOperator = "require('child_process').exec('echo pwned')";
    expect(() => evaluateCondition(notAnOperator, {})).not.toThrow();
  });
});
