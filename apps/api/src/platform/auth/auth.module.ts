import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { TenancyModule } from "../tenancy/tenancy.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthorizationCodeService } from "./authorization-code.service";
import { DbSessionStore } from "./db-session.store";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { LockoutService } from "./lockout.service";
import { MfaService } from "./mfa.service";
import { PasswordService } from "./password.service";
import { RateLimitGuard } from "./rate-limit.guard";
import { isRedisEnabled } from "../scheduling/redis-enabled.helper";
import { RedisSessionStore } from "./redis-session.store";
import { RedisProvider } from "./redis.provider";
import { RefreshTokenService } from "./refresh-token.service";
import { SESSION_STORE, SessionStore } from "./session-store.interface";
import { TokenService } from "./token.service";

@Module({
  imports: [
    TenancyModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_TOKEN_SECRET,
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    PasswordService,
    LockoutService,
    MfaService,
    AuthorizationCodeService,
    RedisProvider,
    RedisSessionStore,
    // Shared-hosting adaptation (REDIS_ENABLED=false) — lihat banner
    // comment db-session.store.ts.
    DbSessionStore,
    RateLimitGuard,
    {
      provide: SESSION_STORE,
      useFactory: (redisStore: RedisSessionStore, dbStore: DbSessionStore): SessionStore =>
        isRedisEnabled() ? redisStore : dbStore,
      inject: [RedisSessionStore, DbSessionStore],
    },
    {
      // RefreshTokenService di-construct manual (bukan autowiring biasa) —
      // constructor-nya diketik `SessionStore` (interface, tanpa representasi
      // runtime), lihat catatan di session-store.interface.ts.
      provide: RefreshTokenService,
      useFactory: (store: SessionStore) => new RefreshTokenService(store),
      inject: [SESSION_STORE],
    },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [TokenService, RefreshTokenService, PasswordService],
})
export class AuthModule {}
