import { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";
export declare class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor();
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    /**
     * Bungkus satu unit kerja dalam transaksi + `SET LOCAL app.current_tenant_id`
     * (TDD §5.2), tenant_id diambil dari AsyncLocalStorage (TDD §5.1) — bukan
     * parameter manual, supaya tidak ada jalur query yang lupa filter tenant.
     * Fail closed (TDD §2 prinsip 6): tanpa tenant context, request ditolak.
     *
     * Task 0.13 — turut men-`SET LOCAL` user_id/correlation_id/ip_address/
     * user_agent (kalau ada di context) supaya trigger `audit_log_capture()`
     * (Master PRD §11.6) bisa membaca `current_setting('app.current_xxx')` dan
     * mengisi kolom actor_user_id/correlation_id/ip_address/user_agent baris
     * audit — TANPA modul pemanggil withRls() perlu tahu apa-apa soal audit
     * log (observer benar-benar "global": nol perubahan di 12 modul yang
     * sudah ada). Field selain tenantId OPSIONAL (job cross-tenant seperti
     * workflow-sla-scan tidak selalu punya user/correlation manusia).
     */
    withRls<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
    /**
     * Task 1.2 — varian withRls() untuk tabel GLOBAL tanpa tenant_id sama
     * sekali (mis. industry_templates, TDD §6.3 "data referensi non-tenant").
     * TIDAK mensyaratkan tenant context (beda dari withRls() yang fail-closed
     * tanpa itu) — operasinya memang cross-tenant/pre-tenant (mis. daftar
     * katalog dipanggil SEBELUM tenant baru dibuat, PRD Modul 01 §4.1 setup
     * wizard). tenant_id SENGAJA tidak pernah di-SET LOCAL sama sekali di
     * sini (bukan cuma di-skip kalau kosong seperti userId/dst di bawah —
     * kolomnya memang tidak relevan untuk tabel yang memakai method ini).
     * actor_user_id/correlation_id/dst tetap diisi kalau context-nya ADA,
     * supaya audit_log_capture() (0.13) tetap akurat untuk write yang
     * benar-benar datang dari request terautentikasi (bukan seed/job).
     */
    withGlobalContext<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
