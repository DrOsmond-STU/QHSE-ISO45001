import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../tenancy/prisma.service";
import { getCurrentTenantId } from "../tenancy/tenant-context";
import { computePeriodKey, renderNumberPattern } from "./numbering-pattern";

// TDD §5.1/§9 — tenant SELALU ambient lewat tenantContextStorage, TIDAK ada
// parameter tenantId eksplisit di method publik (persis pola
// WorkflowEngineService task 0.9), walau TESTING §6 menulis contoh kode
// dengan `tenantId` sebagai argumen literal — itu pseudo-code ilustratif
// untuk skenario konkurensi, bukan kontrak signature yang mengikat (sama
// perlakuan yang sudah diberikan ke workflow-engine terhadap TDD §9 prose).

function requireTenantId(): string {
  const tenantId = getCurrentTenantId();
  if (!tenantId) {
    throw new Error("Tenant context tidak ditemukan — request ditolak (fail closed).");
  }
  return tenantId;
}

export interface GenerateNextOptions {
  /** Site/company UUID mentah (tanpa FK, lihat banner comment schema.prisma
   * "Task 0.10") — wajib diisi kalau baris numbering_configs terkait
   * scope_level COMPANY/SITE, dibiarkan kosong kalau TENANT. */
  scopeId?: string;
  /** Token pattern yang tidak bisa diresolusi service ini sendiri, mis.
   * {SITE_CODE}/{COMPANY_CODE} — lihat numbering-pattern.ts. */
  variables?: Record<string, string>;
}

@Injectable()
export class NumberingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Master PRD §10 — generate nomor dokumen/record legal berikutnya untuk
   * `moduleCode` (mis. WORK_PERMIT/INCIDENT/CAPA). Atomic: row lock
   * (`SELECT ... FOR UPDATE`) di dalam transaksi RLS yang sama supaya
   * submission konkuren TIDAK PERNAH menghasilkan nomor duplikat (TESTING
   * §6) — panggilan kedua yang konkuren blok di lock sampai panggilan
   * pertama commit, baru baca last_sequence yang sudah ter-update.
   *
   * Reset periode (YEARLY/MONTHLY) dievaluasi tiap panggilan (bandingkan
   * computePeriodKey sekarang vs baris tersimpan) — kalau beda, sequence
   * reset ke 1 alih-alih lanjut, dan lastPeriodKey baris di-update.
   *
   * Render pattern (bisa throw kalau ada token tak dikenal/variables
   * kurang) SENGAJA dijalankan SEBELUM tx.numberingConfig.update() —
   * kegagalan render tidak boleh "membakar" nomor urut (row lock + seluruh
   * transaksi otomatis rollback kalau exception dilempar sebelum commit).
   *
   * TIDAK ada dedup/idempotency-key eksplisit di sini per desain: caller
   * (modul domain) yang punya kolom nomor nullable di record-nya sendiri
   * (mis. `work_permits.permit_number`) bertanggung jawab tidak memanggil
   * ulang generateNext() untuk record yang SUDAH punya nomor — sama seperti
   * WorkflowEngineService.startInstance() (task 0.9) tidak dedup sendiri
   * terhadap entityId yang sama. Idempotency HTTP-level (`Idempotency-Key`
   * header, TDD §7.1) juga tanggung jawab endpoint POST modul domain, bukan
   * service platform generik ini.
   */
  async generateNext(moduleCode: string, options: GenerateNextOptions = {}): Promise<string> {
    const tenantId = requireTenantId();
    const scopeId = options.scopeId ?? null;

    return this.prisma.withRls(async (tx) => {
      // Row lock dulu (raw query, FOR UPDATE), baru baca typed — pola sama
      // dengan WorkflowEngineService.actOnTask (task 0.9). "IS NOT DISTINCT
      // FROM" (bukan "=") supaya scope_id NULL (scope TENANT) tetap match —
      // "= NULL" di SQL selalu UNKNOWN, tidak pernah match apa pun.
      const locked = await tx.$queryRaw<Array<{ numbering_config_id: string }>>`
        SELECT numbering_config_id FROM numbering_configs
        WHERE tenant_id = ${tenantId}::uuid
          AND module_code = ${moduleCode}
          AND scope_id IS NOT DISTINCT FROM ${scopeId}::uuid
        FOR UPDATE
      `;
      if (locked.length === 0) {
        throw new NotFoundException(
          `numbering_configs belum dikonfigurasi untuk module_code=${moduleCode}` +
            (scopeId ? ` scope_id=${scopeId}` : " (scope tenant)") +
            ". Admin wajib setup numbering config dulu sebelum modul ini bisa generate nomor.",
        );
      }
      const config = await tx.numberingConfig.findUniqueOrThrow({ where: { id: locked[0].numbering_config_id } });

      const now = new Date();
      const currentPeriodKey = computePeriodKey(config.resetPeriod, now);
      const isNewPeriod = currentPeriodKey !== config.lastPeriodKey;
      const nextSequence = isNewPeriod ? 1 : config.lastSequence + 1;

      const documentNumber = renderNumberPattern(config.pattern, {
        prefix: config.prefix,
        sequence: nextSequence,
        now,
        variables: options.variables,
      });

      await tx.numberingConfig.update({
        where: { id: config.id },
        data: { lastSequence: nextSequence, lastPeriodKey: currentPeriodKey },
      });

      return documentNumber;
    });
  }
}
