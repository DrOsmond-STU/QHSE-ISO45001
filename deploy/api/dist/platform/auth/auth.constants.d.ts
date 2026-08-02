export declare const ACCESS_TOKEN_TTL_SECONDS: number;
export declare const AUTH_CODE_TTL_SECONDS = 60;
export declare const REFRESH_TOKEN_BYTES = 48;
export declare const LOGIN_RATE_LIMIT_PER_MINUTE = 20;
export declare const DEFAULT_PASSWORD_POLICY: {
    maxFailedAttempts: number;
    lockoutDurationMinutes: number;
    sessionTimeoutMinutes: number;
    mfaRequired: boolean;
};
