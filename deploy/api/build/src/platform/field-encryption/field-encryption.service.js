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
exports.FieldEncryptionService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const node_crypto_1 = require("node:crypto");
const prisma_service_1 = require("../tenancy/prisma.service");
const aes_gcm_codec_1 = require("./aes-gcm-codec");
const field_encryption_constants_1 = require("./field-encryption.constants");
// Task 5.3 (Modul 13 Occupational Health BR-05) — enkripsi field-level
// PERTAMA KALINYA di platform ini. Pola ENVELOPE ENCRYPTION: SATU data
// encryption key (DEK) random 32-byte per-tenant, disimpan (ter-wrap, lihat
// bawah) di tenant_encryption_keys — dipakai LANGSUNG (bukan derive ulang)
// utk enkripsi/dekripsi kolom [ENCRYPTED] modul manapun yang memakai service
// ini. DEK di-generate LAZY saat tenant pertama kali enkripsi data (BUKAN
// dipicu ProvisioningService task 1.5 — sengaja TIDAK menyentuh modul
// fondasi Phase 1 yang sudah selesai+diuji 1230 test demi SATU langkah
// tambahan, lihat banner comment blok Modul 13 schema.prisma), lalu di-wrap
// (dienkripsi) oleh SATU master key dari env var PHI_ENCRYPTION_MASTER_KEY
// sebelum disimpan — placeholder KMS asli (AWS KMS/Azure Key Vault/HSM
// DITUNDA ke TDD terpisah, PRD §13 Open Question #5, BUKAN diputuskan di sini).
//
// tenantId WAJIB EKSPLISIT di setiap panggilan (BUKAN ambient
// getCurrentTenantId() spt NumberingService/WorkflowEngineService — deviasi
// SENGAJA dari konvensi ambient-tenant sesi ini): operasi yang memutuskan
// KUNCI MANA mendekripsi data PHI adalah titik paling kritis di seluruh
// platform, defense-in-depth lebih penting drpd konsistensi gaya di sini —
// caller (domain service) tetap WAJIB baca tenantId dari ambient context
// sendiri (requireTenantId() dsb.) lalu meneruskannya eksplisit ke sini,
// BUKAN FieldEncryptionService yang membaca ambient context diam-diam.
let FieldEncryptionService = class FieldEncryptionService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async encrypt(tenantId, plaintext) {
        if (plaintext === null || plaintext === undefined) {
            return null;
        }
        const dataKey = await this.getOrCreateDataKey(tenantId);
        return (0, aes_gcm_codec_1.encryptWithKey)(dataKey, plaintext);
    }
    async decrypt(tenantId, ciphertext) {
        if (ciphertext === null || ciphertext === undefined) {
            return null;
        }
        const dataKey = await this.getDataKeyOrThrow(tenantId);
        return (0, aes_gcm_codec_1.decryptWithKey)(dataKey, ciphertext);
    }
    /** Serialize+encrypt sembarang value JSON (kolom [ENCRYPTED] yang logisnya
     * JSONB, mis. lab_results) — lihat banner comment blok Modul 13
     * schema.prisma soal alasan storage-nya String, bukan Json. */
    async encryptJson(tenantId, value) {
        if (value === null || value === undefined) {
            return null;
        }
        return this.encrypt(tenantId, JSON.stringify(value));
    }
    async decryptJson(tenantId, ciphertext) {
        const plaintext = await this.decrypt(tenantId, ciphertext);
        if (plaintext === null) {
            return null;
        }
        return JSON.parse(plaintext);
    }
    async getOrCreateDataKey(tenantId) {
        const existing = await this.findDataKeyRow(tenantId);
        if (existing) {
            return this.unwrap(existing.wrappedDataKey);
        }
        const dataKey = (0, node_crypto_1.randomBytes)(field_encryption_constants_1.PHI_DATA_KEY_LENGTH_BYTES);
        const wrapped = (0, aes_gcm_codec_1.encryptWithKey)((0, field_encryption_constants_1.getPhiMasterKey)(), dataKey.toString("base64"));
        // Race benign: dua request konkuren generate DEK BEDA utk tenant yang
        // sama pertama kali (mis. 7 field klinis di-enkripsi paralel via
        // Promise.all di MedicalRecordService) — @unique(tenantId) di DB
        // memutuskan SATU pemenang. TERBUKTI EMPIRIS Prisma upsert() TIDAK
        // atomic thd race ini di dalam interactive transaction: P2002 menjalar
        // keluar, bukan otomatis fallback ke UPDATE. Maka upsert() SENGAJA
        // dijalankan di transaction TERPISAH dari findDataKeyRow() di atas
        // (Postgres abort SELURUH transaction begitu satu statement gagal, jadi
        // tx yang sama tidak bisa dipakai lagi setelah upsert gagal) — kalau
        // P2002, transaction BARU LAGI fetch baris pemenang. TIDAK PERNAH pakai
        // dataKey lokal yang baru dibuatnya sendiri kalau baris pemenang sudah
        // ada — tidak pernah ada dua DEK aktif utk tenant yang sama.
        try {
            const row = await this.withExplicitTenantScope(tenantId, (tx) => tx.tenantEncryptionKey.upsert({
                where: { tenantId },
                create: { tenantId, wrappedDataKey: wrapped },
                update: {},
            }));
            return this.unwrap(row.wrappedDataKey);
        }
        catch (err) {
            if (err instanceof client_1.Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
                const winner = await this.findDataKeyRow(tenantId);
                if (winner) {
                    return this.unwrap(winner.wrappedDataKey);
                }
            }
            throw err;
        }
    }
    async getDataKeyOrThrow(tenantId) {
        const existing = await this.findDataKeyRow(tenantId);
        if (!existing) {
            throw new Error(`Tidak ada encryption key untuk tenant ${tenantId} — belum pernah ada data terenkripsi.`);
        }
        return this.unwrap(existing.wrappedDataKey);
    }
    async findDataKeyRow(tenantId) {
        return this.withExplicitTenantScope(tenantId, (tx) => tx.tenantEncryptionKey.findUnique({ where: { tenantId } }));
    }
    unwrap(wrappedDataKey) {
        return Buffer.from((0, aes_gcm_codec_1.decryptWithKey)((0, field_encryption_constants_1.getPhiMasterKey)(), wrappedDataKey), "base64");
    }
    /**
     * tenant_encryption_keys BERLAKU RLS standar (lihat banner comment
     * schema.prisma) — tapi service ini SENGAJA tidak pakai
     * PrismaService.withRls() (yang membaca tenantId dari ambient
     * getCurrentTenantId()) krn KONTRAK service ini adalah tenantId EKSPLISIT
     * (lihat banner comment kelas). SET LOCAL app.current_tenant_id di sini
     * pakai PARAMETER eksplisit, BUKAN ambient — kalau caller salah kirim
     * tenantId (mis. tidak sinkron dgn context-nya sendiri), operasi ini
     * TETAP scoped ke tenantId yang dikirim (bukan diam-diam salah tenant),
     * itulah esensi "defense-in-depth" yang diklaim banner comment atas.
     */
    async withExplicitTenantScope(tenantId, fn) {
        return this.prisma.$transaction(async (tx) => {
            await tx.$executeRaw `SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
            return fn(tx);
        });
    }
};
exports.FieldEncryptionService = FieldEncryptionService;
exports.FieldEncryptionService = FieldEncryptionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FieldEncryptionService);
