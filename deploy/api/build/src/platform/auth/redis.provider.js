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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisProvider = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
// Client Redis dipakai bersama oleh RedisSessionStore, AuthorizationCodeService,
// RateLimitGuard (TDD §12). Satu koneksi, siklus hidup dikelola Nest (mirror
// pola PrismaService di tenancy/prisma.service.ts).
//
// `lazyConnect: true` (shared-hosting adaptation, REDIS_ENABLED=false) —
// Nest MENGINSTANSIASI setiap provider yang terdaftar di module (termasuk
// RedisSessionStore/RedisPermissionCache walau tidak dipilih jadi
// implementasi aktif lewat SESSION_STORE/PERMISSION_CACHE, lihat
// auth.module.ts/rbac.module.ts) — tanpa lazyConnect, constructor ini akan
// mencoba connect ke Redis yang tidak ada SETIAP kali app boot, terlepas
// dipakai atau tidak. Dengan lazyConnect, koneksi TCP baru dibuka saat
// command pertama benar-benar dipanggil — instance yang tidak pernah
// dipakai (krn REDIS_ENABLED=false) tidak pernah connect sama sekali.
// Tidak mengubah perilaku teramati saat Redis benar-benar dipakai (VPS/
// Docker existing) — connect otomatis di command pertama, transparan.
let RedisProvider = class RedisProvider {
    client;
    constructor() {
        this.client = new ioredis_1.default(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { lazyConnect: true });
    }
    async onModuleDestroy() {
        await this.client.quit();
    }
};
exports.RedisProvider = RedisProvider;
exports.RedisProvider = RedisProvider = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], RedisProvider);
