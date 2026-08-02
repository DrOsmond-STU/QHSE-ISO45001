export interface MandatoryItemCheckTemplateItem {
    id: string;
    isMandatory: boolean;
}
export interface MandatoryItemCheckRecordItem {
    templateItemId: string;
}
export declare function assertAllMandatoryItemsAnswered(templateItems: MandatoryItemCheckTemplateItem[], recordItems: MandatoryItemCheckRecordItem[]): void;
