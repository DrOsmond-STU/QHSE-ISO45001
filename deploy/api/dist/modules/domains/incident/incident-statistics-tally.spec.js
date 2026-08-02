"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const incident_statistics_tally_1 = require("./incident-statistics-tally");
describe("tallyIncidentCounts", () => {
    it("menghitung tiap klasifikasi ke kolom count yang benar", () => {
        const result = (0, incident_statistics_tally_1.tallyIncidentCounts)([
            { classification: "FATALITY", daysLost: null },
            { classification: "LOST_TIME_INJURY", daysLost: 10 },
            { classification: "LOST_TIME_INJURY", daysLost: 5 },
            { classification: "RESTRICTED_WORK_CASE", daysLost: null },
            { classification: "MEDICAL_TREATMENT", daysLost: null },
            { classification: "FIRST_AID", daysLost: null },
            { classification: "NEAR_MISS", daysLost: null },
            { classification: "PROPERTY_DAMAGE", daysLost: null },
            { classification: "ENVIRONMENTAL_SPILL", daysLost: null },
            { classification: "PROCESS_SAFETY_EVENT", daysLost: null },
        ]);
        expect(result).toEqual({
            fatalityCount: 1,
            ltiCount: 2,
            restrictedWorkCount: 1,
            medicalTreatmentCount: 1,
            firstAidCount: 1,
            nearMissCount: 1,
            propertyDamageCount: 1,
            environmentalSpillCount: 1,
            processSafetyEventCount: 1,
            totalDaysLost: 15,
        });
    });
    it("array kosong -> seluruh count 0", () => {
        const result = (0, incident_statistics_tally_1.tallyIncidentCounts)([]);
        expect(result.fatalityCount).toBe(0);
        expect(result.totalDaysLost).toBe(0);
    });
    it("daysLost null diperlakukan sbg 0", () => {
        const result = (0, incident_statistics_tally_1.tallyIncidentCounts)([{ classification: "NEAR_MISS", daysLost: null }]);
        expect(result.totalDaysLost).toBe(0);
    });
});
//# sourceMappingURL=incident-statistics-tally.spec.js.map