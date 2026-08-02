export interface RequestUser {
    userId: string;
    tenantId: string;
    sessionId: string;
    scopeRoles: string[];
}
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
