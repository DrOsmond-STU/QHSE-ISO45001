"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const jwt_1 = require("@nestjs/jwt");
const tenancy_module_1 = require("../tenancy/tenancy.module");
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const authorization_code_service_1 = require("./authorization-code.service");
const db_session_store_1 = require("./db-session.store");
const jwt_auth_guard_1 = require("./jwt-auth.guard");
const lockout_service_1 = require("./lockout.service");
const mfa_service_1 = require("./mfa.service");
const password_service_1 = require("./password.service");
const rate_limit_guard_1 = require("./rate-limit.guard");
const redis_enabled_helper_1 = require("../scheduling/redis-enabled.helper");
const redis_session_store_1 = require("./redis-session.store");
const redis_provider_1 = require("./redis.provider");
const refresh_token_service_1 = require("./refresh-token.service");
const session_store_interface_1 = require("./session-store.interface");
const token_service_1 = require("./token.service");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            tenancy_module_1.TenancyModule,
            jwt_1.JwtModule.register({
                secret: process.env.JWT_ACCESS_TOKEN_SECRET,
            }),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [
            auth_service_1.AuthService,
            token_service_1.TokenService,
            password_service_1.PasswordService,
            lockout_service_1.LockoutService,
            mfa_service_1.MfaService,
            authorization_code_service_1.AuthorizationCodeService,
            redis_provider_1.RedisProvider,
            redis_session_store_1.RedisSessionStore,
            // Shared-hosting adaptation (REDIS_ENABLED=false) — lihat banner
            // comment db-session.store.ts.
            db_session_store_1.DbSessionStore,
            rate_limit_guard_1.RateLimitGuard,
            {
                provide: session_store_interface_1.SESSION_STORE,
                useFactory: (redisStore, dbStore) => (0, redis_enabled_helper_1.isRedisEnabled)() ? redisStore : dbStore,
                inject: [redis_session_store_1.RedisSessionStore, db_session_store_1.DbSessionStore],
            },
            {
                // RefreshTokenService di-construct manual (bukan autowiring biasa) —
                // constructor-nya diketik `SessionStore` (interface, tanpa representasi
                // runtime), lihat catatan di session-store.interface.ts.
                provide: refresh_token_service_1.RefreshTokenService,
                useFactory: (store) => new refresh_token_service_1.RefreshTokenService(store),
                inject: [session_store_interface_1.SESSION_STORE],
            },
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_1.JwtAuthGuard },
        ],
        exports: [token_service_1.TokenService, refresh_token_service_1.RefreshTokenService, password_service_1.PasswordService],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map