"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SESSION_STORE = void 0;
// Interface TypeScript tidak punya representasi runtime — Nest DI butuh token
// eksplisit untuk inject implementasi (RedisSessionStore) ke tempat yang
// constructor-nya diketik `SessionStore` (mis. RefreshTokenService, dibangun
// lewat factory provider di auth.module.ts, bukan autowiring biasa).
exports.SESSION_STORE = Symbol("SESSION_STORE");
//# sourceMappingURL=session-store.interface.js.map