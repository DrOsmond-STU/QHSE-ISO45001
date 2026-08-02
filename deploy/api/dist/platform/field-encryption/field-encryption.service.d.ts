import { PrismaService } from "../tenancy/prisma.service";
export declare class FieldEncryptionService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    encrypt(tenantId: string, plaintext: string): Promise<string>;
    encrypt(tenantId: string, plaintext: string | null | undefined): Promise<string | null>;
    decrypt(tenantId: string, ciphertext: string): Promise<string>;
    decrypt(tenantId: string, ciphertext: string | null | undefined): Promise<string | null>;
    /** Serialize+encrypt sembarang value JSON (kolom [ENCRYPTED] yang logisnya
     * JSONB, mis. lab_results) — lihat banner comment blok Modul 13
     * schema.prisma soal alasan storage-nya String, bukan Json. */
    encryptJson(tenantId: string, value: unknown): Promise<string | null>;
    decryptJson<T>(tenantId: string, ciphertext: string | null | undefined): Promise<T | null>;
    private getOrCreateDataKey;
    private getDataKeyOrThrow;
    private findDataKeyRow;
    private unwrap;
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
    private withExplicitTenantScope;
}
