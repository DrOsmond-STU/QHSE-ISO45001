"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findPlansWithOverdueReview = findPlansWithOverdueReview;
const emergency_response_plan_lifecycle_1 = require("./emergency-response-plan-lifecycle");
function findPlansWithOverdueReview(candidates, now) {
    return candidates.filter((c) => (0, emergency_response_plan_lifecycle_1.isPlanReviewOverdueBy30Days)(c.nextReviewDueDate, now));
}
