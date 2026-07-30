// BR-01 (PRD Modul 08 §6) — "inspection_records tidak dapat berstatus
// COMPLETED jika ada template_item.is_mandatory=TRUE yang belum diisi
// response_value."
export interface MandatoryItemCheckTemplateItem {
  id: string;
  isMandatory: boolean;
}

export interface MandatoryItemCheckRecordItem {
  templateItemId: string;
}

export function assertAllMandatoryItemsAnswered(
  templateItems: MandatoryItemCheckTemplateItem[],
  recordItems: MandatoryItemCheckRecordItem[],
): void {
  const answeredTemplateItemIds = new Set(recordItems.map((r) => r.templateItemId));
  const unanswered = templateItems.filter((t) => t.isMandatory && !answeredTemplateItemIds.has(t.id));
  if (unanswered.length > 0) {
    throw new Error(
      `inspection_records tidak dapat COMPLETED — ${unanswered.length} item wajib (is_mandatory=TRUE) belum diisi response_value (BR-01).`,
    );
  }
}
