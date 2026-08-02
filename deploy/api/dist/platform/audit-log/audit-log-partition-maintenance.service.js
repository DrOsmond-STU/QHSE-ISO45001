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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogPartitionMaintenanceService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../observability/app-logger.service");
const audit_log_partition_1 = require("./audit-log-partition");
// TDD §13.1 — job "audit-log-partition-maintenance" (cron bulanan): buat
// partisi bulan berikutnya untuk system_audit_logs. Drop/arsip partisi
// KEDALUWARSA sesuai retensi SENGAJA belum diimplementasikan di sini —
// Master PRD §14.6 eksplisit: retensi audit "wajib dikonfirmasi ke regulasi
// spesifik industri tenant", default TIDAK dihapus otomatis — job ini HANYA
// memastikan partisi mendatang tersedia (persis acceptance criterion task
// 0.13), belum drop/archive (gap didokumentasikan TDD §26, perlu keputusan
// retensi final dulu).
//
// Connect via DATABASE_URL (role admin/pemilik tabel, BUKAN qhse_app/
// APP_DATABASE_URL) — SENGAJA, bukan cuma ikut pola cross-tenant
// WorkflowSlaScanService 0.9. Kalau qhse_app yang menjalankan
// `CREATE TABLE ... PARTITION OF`, qhse_app JADI OWNER partisi baru itu
// (ownership = siapa pun yang CREATE, bukan berdasar privilege
// schema) — dan sebagai owner, REVOKE UPDATE/DELETE dari dirinya sendiri
// jadi bukan boundary keras lagi (owner selalu bisa GRANT balik ke diri
// sendiri kapan saja). Dengan role admin yang membuat SEMUA partisi
// (awal maupun runtime), qhse_app SELALU cuma grantee biasa di setiap
// partisi, konsisten dgn acceptance criterion "entri audit tidak bisa
// diedit/dihapus" — bukan jaminan yang terus melemah tiap bulan baru.
let AuditLogPartitionMaintenanceService = class AuditLogPartitionMaintenanceService {
    logger;
    adminPrisma;
    constructor(logger) {
        this.logger = logger;
        this.adminPrisma = new client_1.PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    }
    async onModuleDestroy() {
        await this.adminPrisma.$disconnect();
    }
    /**
     * Idempotent — aman dipanggil berkali-kali (TDD §13.2, semua job wajib
     * idempotent). Memastikan partisi bulan INI dan bulan BERIKUTNYA ada
     * (bukan cuma "bulan berikutnya" harfiah) — buffer 2 bulan supaya sekali
     * gagal/telat jalan (mis. proses worker down beberapa hari) tidak
     * langsung membuat INSERT gagal karena tidak ada partisi yang cocok.
     */
    async run(now = new Date()) {
        const targets = [now, (0, audit_log_partition_1.addMonthsUtc)(now, 1)];
        for (const target of targets) {
            await this.ensurePartition((0, audit_log_partition_1.partitionSpecForMonth)(target));
        }
    }
    async ensurePartition(spec) {
        const exists = await this.partitionExists(spec.tableName);
        if (exists) {
            return;
        }
        // Transaksional — semua langkah (CREATE TABLE, ENABLE/FORCE RLS, CREATE
        // POLICY, REVOKE) berhasil bersama atau gagal bersama, supaya
        // partitionExists() tetap sinyal idempotency yang bisa diandalkan
        // (partisi yang "ada" SELALU berarti sudah aman-diedit juga, tidak
        // pernah setengah-jadi).
        await this.adminPrisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`
        CREATE TABLE "${spec.tableName}" PARTITION OF "system_audit_logs"
        FOR VALUES FROM ('${spec.rangeStartDate}') TO ('${spec.rangeEndDate}')
      `);
            // RLS TIDAK diwariskan dari parent ke partisi (dibuktikan empiris,
            // TDD §26) — wajib diulang eksplisit di SETIAP partisi baru, persis
            // pola migration 20260724092045_enable_rls_audit_log_tables.
            await tx.$executeRawUnsafe(`ALTER TABLE "${spec.tableName}" ENABLE ROW LEVEL SECURITY`);
            await tx.$executeRawUnsafe(`ALTER TABLE "${spec.tableName}" FORCE ROW LEVEL SECURITY`);
            await tx.$executeRawUnsafe(`
        CREATE POLICY tenant_isolation_policy ON "${spec.tableName}"
        USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
      `);
            // ALTER DEFAULT PRIVILEGES (berlaku sejak migration 0.8) otomatis
            // memberi qhse_app SELECT/INSERT/UPDATE/DELETE ke SETIAP tabel baru —
            // termasuk partisi ini — TERLEPAS dari privilege parent-nya saat ini
            // (dibuktikan empiris, TDD §26). REVOKE eksplisit WAJIB diulang di
            // sini, tidak cukup sudah direvoke di parent/migration awal.
            await tx.$executeRawUnsafe(`REVOKE UPDATE, DELETE ON "${spec.tableName}" FROM qhse_app`);
        });
        this.logger.event("info", "audit-log partition dibuat", {
            module: "audit-log",
            action: "partition.created",
            partition_table: spec.tableName,
            range_start: spec.rangeStartDate,
            range_end: spec.rangeEndDate,
        });
    }
    async partitionExists(tableName) {
        const rows = await this.adminPrisma.$queryRaw `
      SELECT EXISTS (
        SELECT 1 FROM pg_class WHERE relname = ${tableName} AND relnamespace = 'public'::regnamespace
      ) AS exists
    `;
        return rows[0]?.exists ?? false;
    }
};
exports.AuditLogPartitionMaintenanceService = AuditLogPartitionMaintenanceService;
exports.AuditLogPartitionMaintenanceService = AuditLogPartitionMaintenanceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [app_logger_service_1.AppLoggerService])
], AuditLogPartitionMaintenanceService);
//# sourceMappingURL=audit-log-partition-maintenance.service.js.map