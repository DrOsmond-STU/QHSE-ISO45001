import { OnModuleInit } from "@nestjs/common";
export interface HeadObjectResult {
    exists: boolean;
    sizeBytes?: number;
    contentType?: string;
}
export declare class ObjectStorageService implements OnModuleInit {
    private readonly logger;
    private readonly client;
    private readonly bucket;
    private readonly localRoot;
    private readonly localSigningSecret;
    private readonly publicBaseUrl;
    constructor();
    /**
     * Create-if-not-exists idempoten — pengganti `mc.exe mb` (tidak
     * di-download terpisah, lihat komentar dev-minio-setup.sh) supaya bucket
     * provisioning jadi kode, bukan binary tambahan. Mode local: buat root
     * directory kalau belum ada (padanan "bucket").
     */
    onModuleInit(): Promise<void>;
    /** Cegah path traversal (key datang dari attachmentId/fileName yang sudah
     * di-sanitize buildStorageKey(), tapi defense-in-depth kedua di sini —
     * tolak apa pun yang lolos ke luar localRoot setelah normalize()). */
    private resolveLocalPath;
    /** Key deterministik, tenant-namespaced di path-nya sendiri (defense in
     * depth di luar RLS — RLS melindungi baris `attachments`, bukan object
     * storage; struktur key ini mencegah tenant lain menebak key file
     * tenant lain lewat pola nama yang predictable). */
    buildStorageKey(tenantId: string, attachmentId: string, fileName: string): string;
    buildThumbnailKey(storageKey: string): string;
    presignPutUrl(key: string, contentType: string): Promise<string>;
    /** Dipanggil HANYA setelah caller (AttachmentService) verifikasi
     * scanStatus=CLEAN — presign URL sendiri tidak tahu/tidak enforce status
     * scan, itu tanggung jawab caller (lihat banner comment schema.prisma
     * "Task 0.12"). */
    presignGetUrl(key: string): Promise<string>;
    /** Otoritatif — dipakai confirm() memvalidasi size/mime SUNGGUHAN yang
     * ter-upload (TDD §11: "divalidasi di server saat confirm, bukan hanya
     * client-side"), bukan klaim client saat presign(). */
    headObject(key: string): Promise<HeadObjectResult>;
    getObjectBuffer(key: string): Promise<Buffer>;
    putObject(key: string, body: Buffer, contentType: string): Promise<void>;
    private isNotFoundError;
}
