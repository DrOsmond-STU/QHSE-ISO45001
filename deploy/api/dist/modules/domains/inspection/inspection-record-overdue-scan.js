"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findOverdueInspectionRecords = findOverdueInspectionRecords;
function findOverdueInspectionRecords(candidates, now) {
    return candidates.filter((c) => c.plannedDate !== null && c.plannedDate.getTime() < now.getTime());
}
//# sourceMappingURL=inspection-record-overdue-scan.js.map