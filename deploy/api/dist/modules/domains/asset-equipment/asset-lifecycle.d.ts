import { AssetConditionStatus, AssetLifecycleStatus, MaintenanceIntervalType } from "@prisma/client";
export declare function isMaintenanceDueSoon(nextDueDate: Date, now: Date): boolean;
export declare function isMaintenanceOverdue(nextDueDate: Date, now: Date): boolean;
export declare function calculateDaysOverdue(nextDueDate: Date, now: Date): number;
export declare function shouldDeactivateSchedulesOnLifecycleChange(newStatus: AssetLifecycleStatus): boolean;
export declare function isSafetyCriticalNewlyFlagged(previous: boolean, next: boolean): boolean;
export declare function requiresDisposalWorkflow(newStatus: AssetLifecycleStatus, categoryRequiresDisposalApproval: boolean): boolean;
export declare function isSafetyCriticalOutOfServiceAlertRequired(isSafetyCritical: boolean, conditionStatus: AssetConditionStatus): boolean;
export declare function calculateNextDueDate(fromDate: Date, intervalType: MaintenanceIntervalType, intervalValue: number): Date | null;
