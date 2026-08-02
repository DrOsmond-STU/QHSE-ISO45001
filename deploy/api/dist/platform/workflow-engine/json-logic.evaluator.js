"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateCondition = evaluateCondition;
const json_logic_js_1 = __importDefault(require("json-logic-js"));
// TDD §9 — kondisi transisi dievaluasi lewat JSON Logic, BUKAN eval() string
// bebas (risiko keamanan: eval bisa eksekusi kode arbitrer). json-logic-js
// murni interpreter atas AST JSON — tidak pernah panggil eval()/Function()
// secara internal, jadi condition dari DB tidak pernah jadi vektor eksekusi
// kode. File ini SATU-SATUNYA titik import library-nya di seluruh codebase.
//
// condition NULL/undefined = transisi tanpa syarat (selalu match) — dipakai
// mis. transisi default/fallback yang tidak butuh percabangan.
function evaluateCondition(condition, contextData) {
    if (condition === null || condition === undefined) {
        return true;
    }
    return Boolean(json_logic_js_1.default.apply(condition, contextData));
}
//# sourceMappingURL=json-logic.evaluator.js.map