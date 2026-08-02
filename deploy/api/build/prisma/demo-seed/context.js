"use strict";
// Tipe bersama seluruh script demo-seed/*.ts — SATU tenant demo dgn banyak
// user lintas 18 role tenant-assignable (SUPER_ADMIN_PLATFORM dikecualikan,
// cross-tenant), dipakai tiap modul seeder utk actor context yang realistis
// (bukan satu user generik utk semua panggilan).
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAY_MS = void 0;
exports.actor = actor;
exports.actors = actors;
exports.daysFromNow = daysFromNow;
exports.daysAgo = daysAgo;
/** Ambil SATU user pertama dgn role tsb — throw kalau tidak ada (fail-fast,
 * bukan diam-diam pakai undefined) supaya salah ketik roleCode ketahuan
 * langsung, bukan nanti pas Prisma FK error yang jauh lebih membingungkan. */
function actor(ctx, roleCode) {
    const found = ctx.users.find((u) => u.roleCode === roleCode);
    if (!found)
        throw new Error(`demo-seed: tidak ada user dgn roleCode=${roleCode}`);
    return found;
}
/** Ambil SEMUA user dgn role tsb (mis. WORKER_EMPLOYEE ada beberapa). */
function actors(ctx, roleCode) {
    return ctx.users.filter((u) => u.roleCode === roleCode);
}
exports.DAY_MS = 1000 * 60 * 60 * 24;
function daysFromNow(days) {
    return new Date(Date.now() + days * exports.DAY_MS);
}
function daysAgo(days) {
    return new Date(Date.now() - days * exports.DAY_MS);
}
