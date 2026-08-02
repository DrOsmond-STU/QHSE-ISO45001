export interface ActionPlanForCompletionCheck {
    statusCache: string;
}
export declare function assertAllActionPlansCompleted(actionPlans: ActionPlanForCompletionCheck[]): void;
export interface ActionPlanForTrackingCheck {
    id: string;
    actionTrackingId: string | null;
}
export declare function assertActionTrackingIdRequired(actionPlans: ActionPlanForTrackingCheck[]): void;
