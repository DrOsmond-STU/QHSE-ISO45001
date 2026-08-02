"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkLeadAuditorCompetencyWarnings = checkLeadAuditorCompetencyWarnings;
function checkLeadAuditorCompetencyWarnings(teamMembers, competencyRecords, standardCode, now) {
    const leadAuditors = teamMembers.filter((m) => m.roleInTeam === "LEAD_AUDITOR");
    const warnings = [];
    for (const lead of leadAuditors) {
        const hasActiveMatch = competencyRecords.some((c) => c.userId === lead.userId &&
            c.standardScope === standardCode &&
            c.status === "ACTIVE" &&
            (!c.expiryDate || c.expiryDate.getTime() >= now.getTime()));
        if (!hasActiveMatch) {
            warnings.push(`Lead Auditor (user ${lead.userId}) tidak memiliki auditor_competency_records ACTIVE untuk standard_scope="${standardCode}" (BR-01, soft warning).`);
        }
    }
    return warnings;
}
//# sourceMappingURL=auditor-competency-rules.js.map