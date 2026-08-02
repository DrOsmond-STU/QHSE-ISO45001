export interface LockoutState {
    failedLoginAttempts: number;
    lockedUntil: Date | null;
}
export interface LockoutPolicy {
    maxFailedAttempts: number;
    lockoutDurationMinutes: number;
}
export declare class LockoutService {
    isLocked(state: LockoutState, now?: Date): boolean;
    recordFailure(state: LockoutState, policy: LockoutPolicy, now?: Date): LockoutState;
    resetOnSuccess(): LockoutState;
}
