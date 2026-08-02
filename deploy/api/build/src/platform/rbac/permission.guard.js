"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const permission_service_1 = require("./permission.service");
const require_permission_decorator_1 = require("./require-permission.decorator");
// APP_GUARD kedua (didaftarkan RbacModule, setelah JwtAuthGuard di
// app.module.ts) — TIDAK fail-closed-by-default seperti JwtAuthGuard: route
// tanpa @RequirePermission() adalah no-op (lolos), supaya route yang sudah
// ada (mis. /auth/logout-all, self-service) tidak tiba-tiba butuh permission
// yang tidak relevan. Guard ini murni ADDITIVE untuk route yang eksplisit
// menandai diri.
let PermissionGuard = class PermissionGuard {
    permissionService;
    reflector;
    constructor(permissionService, reflector) {
        this.permissionService = permissionService;
        this.reflector = reflector;
    }
    async canActivate(context) {
        const metadata = this.reflector.getAllAndOverride(require_permission_decorator_1.REQUIRE_PERMISSION_KEY, [context.getHandler(), context.getClass()]);
        if (!metadata) {
            return true;
        }
        const req = context.switchToHttp().getRequest();
        const user = req.user;
        if (!user) {
            // JwtAuthGuard (APP_GUARD sebelumnya) seharusnya sudah menolak request
            // tanpa user sebelum guard ini jalan — kalau tetap sampai sini tanpa
            // user, fail closed juga (jangan asumsikan lolos).
            throw new common_1.ForbiddenException("Akses ditolak.");
        }
        const scopeContext = metadata.scopeType && metadata.scopeParam
            ? { scopeType: metadata.scopeType, scopeId: extractScopeId(req, metadata.scopeParam) }
            : undefined;
        const allowed = await this.permissionService.hasPermission(user.userId, user.tenantId, metadata.code, scopeContext);
        if (!allowed) {
            throw new common_1.ForbiddenException("Anda tidak memiliki permission untuk aksi ini.");
        }
        return true;
    }
};
exports.PermissionGuard = PermissionGuard;
exports.PermissionGuard = PermissionGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [permission_service_1.PermissionService,
        core_1.Reflector])
], PermissionGuard);
function extractScopeId(req, paramName) {
    const value = req.params?.[paramName] ?? req.body?.[paramName] ?? req.query?.[paramName];
    return String(value ?? "");
}
