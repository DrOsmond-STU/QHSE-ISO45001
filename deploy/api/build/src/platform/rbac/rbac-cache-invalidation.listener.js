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
exports.RbacCacheInvalidationListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const rbac_constants_1 = require("./rbac.constants");
const permission_service_1 = require("./permission.service");
let RbacCacheInvalidationListener = class RbacCacheInvalidationListener {
    permissionService;
    constructor(permissionService) {
        this.permissionService = permissionService;
    }
    async onRoleChanged(payload) {
        await this.permissionService.invalidateCache(payload.userId);
    }
    async onPermissionChanged(payload) {
        await this.permissionService.invalidateForRole(payload.roleId, payload.tenantId);
    }
};
exports.RbacCacheInvalidationListener = RbacCacheInvalidationListener;
__decorate([
    (0, event_emitter_1.OnEvent)(rbac_constants_1.ROLE_CHANGED_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RbacCacheInvalidationListener.prototype, "onRoleChanged", null);
__decorate([
    (0, event_emitter_1.OnEvent)(rbac_constants_1.PERMISSION_CHANGED_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RbacCacheInvalidationListener.prototype, "onPermissionChanged", null);
exports.RbacCacheInvalidationListener = RbacCacheInvalidationListener = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [permission_service_1.PermissionService])
], RbacCacheInvalidationListener);
