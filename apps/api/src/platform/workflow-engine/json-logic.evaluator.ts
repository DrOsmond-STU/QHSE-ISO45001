import jsonLogic from "json-logic-js";

// TDD §9 — kondisi transisi dievaluasi lewat JSON Logic, BUKAN eval() string
// bebas (risiko keamanan: eval bisa eksekusi kode arbitrer). json-logic-js
// murni interpreter atas AST JSON — tidak pernah panggil eval()/Function()
// secara internal, jadi condition dari DB tidak pernah jadi vektor eksekusi
// kode. File ini SATU-SATUNYA titik import library-nya di seluruh codebase.
//
// condition NULL/undefined = transisi tanpa syarat (selalu match) — dipakai
// mis. transisi default/fallback yang tidak butuh percabangan.
export function evaluateCondition(condition: unknown, contextData: Record<string, unknown>): boolean {
  if (condition === null || condition === undefined) {
    return true;
  }
  return Boolean(jsonLogic.apply(condition as jsonLogic.RulesLogic, contextData));
}
