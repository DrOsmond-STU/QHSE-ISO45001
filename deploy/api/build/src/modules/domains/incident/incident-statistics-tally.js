"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tallyIncidentCounts = tallyIncidentCounts;
const COUNT_FIELD_BY_CLASSIFICATION = {
    FATALITY: "fatalityCount",
    LOST_TIME_INJURY: "ltiCount",
    RESTRICTED_WORK_CASE: "restrictedWorkCount",
    MEDICAL_TREATMENT: "medicalTreatmentCount",
    FIRST_AID: "firstAidCount",
    NEAR_MISS: "nearMissCount",
    PROPERTY_DAMAGE: "propertyDamageCount",
    ENVIRONMENTAL_SPILL: "environmentalSpillCount",
    PROCESS_SAFETY_EVENT: "processSafetyEventCount",
};
function tallyIncidentCounts(reports) {
    const result = {
        fatalityCount: 0,
        ltiCount: 0,
        restrictedWorkCount: 0,
        medicalTreatmentCount: 0,
        firstAidCount: 0,
        nearMissCount: 0,
        propertyDamageCount: 0,
        environmentalSpillCount: 0,
        processSafetyEventCount: 0,
        totalDaysLost: 0,
    };
    for (const report of reports) {
        const field = COUNT_FIELD_BY_CLASSIFICATION[report.classification];
        if (field)
            result[field] += 1;
        result.totalDaysLost += report.daysLost ?? 0;
    }
    return result;
}
