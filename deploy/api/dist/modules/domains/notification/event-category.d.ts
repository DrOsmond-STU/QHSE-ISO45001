export interface EventCategoryDef {
    code: string;
    label: string;
}
export declare const EVENT_CATEGORIES: readonly EventCategoryDef[];
export declare function isKnownEventCategory(code: string): boolean;
export declare function getCategoryLabel(code: string): string;
