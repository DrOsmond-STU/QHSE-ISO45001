"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertVerifierNotPic = assertVerifierNotPic;
// BR-03 — "verified_by pada capa_effectiveness_verification tidak boleh
// sama dengan pic_user_id pada capa_action_plans manapun dalam CAPA yang
// sama (segregation of duty) — divalidasi di service layer saat submit
// verifikasi."
function assertVerifierNotPic(verifiedBy, picUserIds) {
    if (picUserIds.includes(verifiedBy)) {
        throw new Error("capa_effectiveness_verification tidak dapat dibuat — verified_by sama dengan pic_user_id salah satu capa_action_plans CAPA ini (BR-03, segregation of duty).");
    }
}
//# sourceMappingURL=capa-effectiveness-rules.js.map