"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenancyModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("./prisma.service");
const tenancy_smoke_test_controller_1 = require("./tenancy-smoke-test.controller");
const tenant_context_middleware_1 = require("./tenant-context.middleware");
const tenant_cors_resolver_service_1 = require("./tenant-cors-resolver.service");
let TenancyModule = class TenancyModule {
    configure(consumer) {
        consumer.apply(tenant_context_middleware_1.TenantContextMiddleware).forRoutes("*");
    }
};
exports.TenancyModule = TenancyModule;
exports.TenancyModule = TenancyModule = __decorate([
    (0, common_1.Module)({
        controllers: [tenancy_smoke_test_controller_1.TenancySmokeTestController],
        providers: [prisma_service_1.PrismaService, tenant_cors_resolver_service_1.TenantCorsResolverService],
        exports: [prisma_service_1.PrismaService, tenant_cors_resolver_service_1.TenantCorsResolverService],
    })
], TenancyModule);
//# sourceMappingURL=tenancy.module.js.map