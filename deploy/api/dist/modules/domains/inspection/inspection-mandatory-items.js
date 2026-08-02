"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertAllMandatoryItemsAnswered = assertAllMandatoryItemsAnswered;
function assertAllMandatoryItemsAnswered(templateItems, recordItems) {
    const answeredTemplateItemIds = new Set(recordItems.map((r) => r.templateItemId));
    const unanswered = templateItems.filter((t) => t.isMandatory && !answeredTemplateItemIds.has(t.id));
    if (unanswered.length > 0) {
        throw new Error(`inspection_records tidak dapat COMPLETED — ${unanswered.length} item wajib (is_mandatory=TRUE) belum diisi response_value (BR-01).`);
    }
}
//# sourceMappingURL=inspection-mandatory-items.js.map