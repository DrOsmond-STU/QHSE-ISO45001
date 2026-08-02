"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeNextGenerationDate = computeNextGenerationDate;
exports.findSchedulesDueForGeneration = findSchedulesDueForGeneration;
// PRD §4 poin 2-3 — generator instance dari inspection_schedules. Aritmatika
// kalender NATIVE Date (UTC, hindari drift timezone) — TIDAK pakai date lib
// eksternal (konsisten codebase ini yang sejauh ini tidak pernah menambah
// date-fns/dayjs). CUSTOM_CRON TIDAK diimplementasikan — butuh cron-expression
// parser (dependency baru di luar cakupan task ini) — caller TIDAK
// memanggil fungsi ini utk pattern itu, next_generation_date statis sampai
// diedit manual, gap TDD §26.
function computeNextGenerationDate(current, pattern) {
    const next = new Date(current);
    switch (pattern) {
        case "DAILY":
            next.setUTCDate(next.getUTCDate() + 1);
            return next;
        case "WEEKLY":
            next.setUTCDate(next.getUTCDate() + 7);
            return next;
        case "MONTHLY":
            next.setUTCMonth(next.getUTCMonth() + 1);
            return next;
        case "QUARTERLY":
            next.setUTCMonth(next.getUTCMonth() + 3);
            return next;
        case "CUSTOM_CRON":
            return null;
        default:
            return null;
    }
}
function findSchedulesDueForGeneration(candidates, now) {
    return candidates.filter((c) => {
        if (!c.isActive)
            return false;
        if (c.nextGenerationDate.getTime() > now.getTime())
            return false;
        if (c.startDate && c.startDate.getTime() > now.getTime())
            return false;
        if (c.endDate && c.endDate.getTime() < now.getTime())
            return false;
        return true;
    });
}
