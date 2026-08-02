"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const incident_severity_1 = require("./incident-severity");
describe("computeSeverityLevel", () => {
    it("FATALITY -> CRITICAL", () => {
        expect((0, incident_severity_1.computeSeverityLevel)("FATALITY")).toBe("CRITICAL");
    });
    it("PROCESS_SAFETY_EVENT dan LOST_TIME_INJURY -> HIGH", () => {
        expect((0, incident_severity_1.computeSeverityLevel)("PROCESS_SAFETY_EVENT")).toBe("HIGH");
        expect((0, incident_severity_1.computeSeverityLevel)("LOST_TIME_INJURY")).toBe("HIGH");
    });
    it("RESTRICTED_WORK_CASE, MEDICAL_TREATMENT, ENVIRONMENTAL_SPILL -> MEDIUM", () => {
        expect((0, incident_severity_1.computeSeverityLevel)("RESTRICTED_WORK_CASE")).toBe("MEDIUM");
        expect((0, incident_severity_1.computeSeverityLevel)("MEDICAL_TREATMENT")).toBe("MEDIUM");
        expect((0, incident_severity_1.computeSeverityLevel)("ENVIRONMENTAL_SPILL")).toBe("MEDIUM");
    });
    it("NEAR_MISS, FIRST_AID, PROPERTY_DAMAGE -> LOW", () => {
        expect((0, incident_severity_1.computeSeverityLevel)("NEAR_MISS")).toBe("LOW");
        expect((0, incident_severity_1.computeSeverityLevel)("FIRST_AID")).toBe("LOW");
        expect((0, incident_severity_1.computeSeverityLevel)("PROPERTY_DAMAGE")).toBe("LOW");
    });
});
//# sourceMappingURL=incident-severity.spec.js.map