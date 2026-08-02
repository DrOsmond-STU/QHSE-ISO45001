import { CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionService } from "./permission.service";
export declare class PermissionGuard implements CanActivate {
    private readonly permissionService;
    private readonly reflector;
    constructor(permissionService: PermissionService, reflector: Reflector);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
