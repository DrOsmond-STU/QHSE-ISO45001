"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const audit_team_rules_1 = require("./audit-team-rules");
describe("assertAuditorIndependence (BR-07)", () => {
    it("tidak throw kalau kandidat tidak punya department (null)", () => {
        expect(() => (0, audit_team_rules_1.assertAuditorIndependence)(null, ["dept-1"])).not.toThrow();
    });
    it("tidak throw kalau audit tidak punya auditee_scope department manapun", () => {
        expect(() => (0, audit_team_rules_1.assertAuditorIndependence)("dept-1", [null, null])).not.toThrow();
    });
    it("tidak throw kalau department kandidat BEDA dari seluruh auditee scope", () => {
        expect(() => (0, audit_team_rules_1.assertAuditorIndependence)("dept-1", ["dept-2", "dept-3"])).not.toThrow();
    });
    it("throw kalau department kandidat SAMA dengan salah satu auditee scope", () => {
        expect(() => (0, audit_team_rules_1.assertAuditorIndependence)("dept-1", ["dept-2", "dept-1"])).toThrow(/BR-07/);
    });
});
