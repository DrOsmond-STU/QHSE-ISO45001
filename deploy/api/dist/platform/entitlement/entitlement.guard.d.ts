import { CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { EntitlementCheckService } from "./entitlement-check.service";
export declare class EntitlementGuard implements CanActivate {
    private readonly entitlementCheckService;
    private readonly reflector;
    constructor(entitlementCheckService: EntitlementCheckService, reflector: Reflector);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
