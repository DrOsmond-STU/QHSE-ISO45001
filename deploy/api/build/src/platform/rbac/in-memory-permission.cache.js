"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryPermissionCache = void 0;
const common_1 = require("@nestjs/common");
// Shared-hosting adaptation (REDIS_ENABLED=false) — pengganti
// RedisPermissionCache. In-memory (Map), BUKAN DB-backed spt DbSessionStore
// — beda dari SessionStore, cache ini murni optimisasi performa (hilang
// begitu proses restart HANYA berarti PermissionService jatuh balik ke
// query DB langsung sekali, bukan celah keamanan/kehilangan state
// spt sesi). Single-process cPanel Node.js app (Passenger) — tidak ada
// concern konsistensi multi-instance.
let InMemoryPermissionCache = class InMemoryPermissionCache {
    store = new Map();
    async get(userId) {
        const entry = this.store.get(userId);
        if (!entry)
            return null;
        if (entry.expiresAt <= Date.now()) {
            this.store.delete(userId);
            return null;
        }
        return entry.value;
    }
    async set(userId, value, ttlSeconds) {
        this.store.set(userId, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    }
    async invalidate(userId) {
        this.store.delete(userId);
    }
};
exports.InMemoryPermissionCache = InMemoryPermissionCache;
exports.InMemoryPermissionCache = InMemoryPermissionCache = __decorate([
    (0, common_1.Injectable)()
], InMemoryPermissionCache);
