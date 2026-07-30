import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getCurrentCorrelationId, getCurrentIpAddress, getCurrentUserAgent } from "../observability/request-context";
import { getCurrentTenantId, getCurrentUserId } from "../tenancy/tenant-context";
import { PrismaService } from "../tenancy/prisma.service";

export interface AuditLogEntry {
  action: string;
  entityType: string;
  entityId?: string;
  beforeValue?: Prisma.InputJsonValue;
  afterValue?: Prisma.InputJsonValue;
}

// Master PRD §11.6 poin 6 — "dicatat otomatis...untuk operasi
// create/update/delete/APPROVE/EXPORT/LOGIN". create/update/delete mutasi
// baris tunggal SUDAH tertangkap generik oleh trigger `audit_log_capture()`
// (audit-log-trigger.template.sql) — service ini untuk SISANYA: aksi
// semantik yang bukan mutasi baris sederhana (login tidak selalu menulis
// baris, export menghasilkan file bukan row, "approve" kadang perlu
// before/after gabungan lintas beberapa baris sekaligus).
//
// record() menerima `tx` EKSPLISIT (pola sama ApproverResolutionService
// 0.9) — WAJIB dipanggil di DALAM withRls() milik caller sendiri supaya
// baris audit atomic dengan operasi bisnis yang memicunya (bukan
// auto-commit terpisah — pelajaran yang sama yang membuat trigger
// dipilih di atas Prisma extension, lihat migration init).
@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(tx: Prisma.TransactionClient, entry: AuditLogEntry): Promise<void> {
    // Trigger generik (audit_log_capture()) mengisi tenant_id/actor_user_id/
    // correlation_id/ip_address/user_agent dari Postgres session GUC
    // (current_setting('app.current_xxx')) yang di-SET LOCAL withRls() —
    // insert manual lewat Prisma model create() di sini TIDAK melalui
    // trigger itu (systemAuditLog bukan tabel yang di-trigger), jadi field
    // yang sama harus diisi eksplisit dari AsyncLocalStorage yang SAMA
    // persis dipakai withRls() supaya kedua jalur (otomatis vs manual)
    // hasilnya konsisten.
    await tx.systemAuditLog.create({
      data: {
        tenantId: getCurrentTenantId(),
        actorUserId: getCurrentUserId(),
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        beforeValue: entry.beforeValue,
        afterValue: entry.afterValue,
        ipAddress: getCurrentIpAddress(),
        userAgent: getCurrentUserAgent(),
        correlationId: getCurrentCorrelationId(),
      },
    });
  }

  /**
   * Convenience untuk pemanggil yang BELUM berada di dalam withRls() milik
   * sendiri (mis. AuthService mencatat event LOGIN yang tidak selalu
   * memodifikasi baris lain). Membuka transaksi withRls() SENDIRI — kalau
   * caller SUDAH punya tx aktif, pakai record(tx, entry) langsung supaya
   * tetap dalam transaksi yang sama (atomicity), JANGAN panggil ini nested.
   */
  async recordStandalone(entry: AuditLogEntry): Promise<void> {
    await this.prisma.withRls((tx) => this.record(tx, entry));
  }
}
