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
var ObjectStorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectStorageService = void 0;
const common_1 = require("@nestjs/common");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const local_storage_util_1 = require("./local-storage.util");
const PRESIGN_UPLOAD_EXPIRY_SECONDS = 15 * 60;
const PRESIGN_DOWNLOAD_EXPIRY_SECONDS = 5 * 60;
function isLocalMode() {
    return process.env.STORAGE_MODE === "local";
}
let ObjectStorageService = ObjectStorageService_1 = class ObjectStorageService {
    logger = new common_1.Logger(ObjectStorageService_1.name);
    client;
    bucket;
    localRoot;
    localSigningSecret;
    publicBaseUrl;
    constructor() {
        this.bucket = process.env.OBJECT_STORAGE_BUCKET ?? "qhse-attachments";
        this.localRoot = process.env.LOCAL_STORAGE_PATH ?? "./storage-local";
        this.localSigningSecret = process.env.LOCAL_STORAGE_SIGNING_SECRET ?? "";
        this.publicBaseUrl = (process.env.API_PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
        if (isLocalMode()) {
            this.client = null;
            if (!this.localSigningSecret) {
                throw new Error("STORAGE_MODE=local butuh LOCAL_STORAGE_SIGNING_SECRET (non-kosong) — lihat panduan deployment.");
            }
            return;
        }
        this.client = new client_s3_1.S3Client({
            endpoint: process.env.OBJECT_STORAGE_ENDPOINT ?? "http://127.0.0.1:9000",
            region: process.env.OBJECT_STORAGE_REGION ?? "us-east-1",
            // MinIO WAJIB path-style (http://endpoint/bucket/key), bukan
            // virtual-hosted-style (http://bucket.endpoint/key) default AWS SDK.
            forcePathStyle: true,
            credentials: {
                accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY ?? "",
                secretAccessKey: process.env.OBJECT_STORAGE_SECRET_KEY ?? "",
            },
        });
    }
    /**
     * Create-if-not-exists idempoten — pengganti `mc.exe mb` (tidak
     * di-download terpisah, lihat komentar dev-minio-setup.sh) supaya bucket
     * provisioning jadi kode, bukan binary tambahan. Mode local: buat root
     * directory kalau belum ada (padanan "bucket").
     */
    async onModuleInit() {
        if (isLocalMode()) {
            await (0, promises_1.mkdir)(this.localRoot, { recursive: true });
            return;
        }
        try {
            await this.client.send(new client_s3_1.HeadBucketCommand({ Bucket: this.bucket }));
        }
        catch {
            await this.client.send(new client_s3_1.CreateBucketCommand({ Bucket: this.bucket }));
            this.logger.log(`Bucket "${this.bucket}" dibuat.`);
        }
    }
    /** Cegah path traversal (key datang dari attachmentId/fileName yang sudah
     * di-sanitize buildStorageKey(), tapi defense-in-depth kedua di sini —
     * tolak apa pun yang lolos ke luar localRoot setelah normalize()). */
    resolveLocalPath(key) {
        const full = (0, node_path_1.normalize)((0, node_path_1.join)(this.localRoot, key));
        const rootWithSep = (0, node_path_1.normalize)(this.localRoot) + node_path_1.sep;
        if (!full.startsWith((0, node_path_1.normalize)(this.localRoot)) || (full !== (0, node_path_1.normalize)(this.localRoot) && !full.startsWith(rootWithSep))) {
            throw new Error(`Storage key tidak valid (path traversal terdeteksi): "${key}"`);
        }
        return full;
    }
    /** Key deterministik, tenant-namespaced di path-nya sendiri (defense in
     * depth di luar RLS — RLS melindungi baris `attachments`, bukan object
     * storage; struktur key ini mencegah tenant lain menebak key file
     * tenant lain lewat pola nama yang predictable). */
    buildStorageKey(tenantId, attachmentId, fileName) {
        const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        return `${tenantId}/${attachmentId}/${safeName}`;
    }
    buildThumbnailKey(storageKey) {
        return `${storageKey}.thumb.jpg`;
    }
    async presignPutUrl(key, contentType) {
        if (isLocalMode()) {
            const token = (0, local_storage_util_1.createLocalStorageToken)({ key, contentType, exp: Date.now() + PRESIGN_UPLOAD_EXPIRY_SECONDS * 1000 }, this.localSigningSecret);
            return `${this.publicBaseUrl}/storage/local/upload/${token}`;
        }
        const command = new client_s3_1.PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
        return (0, s3_request_presigner_1.getSignedUrl)(this.client, command, { expiresIn: PRESIGN_UPLOAD_EXPIRY_SECONDS });
    }
    /** Dipanggil HANYA setelah caller (AttachmentService) verifikasi
     * scanStatus=CLEAN — presign URL sendiri tidak tahu/tidak enforce status
     * scan, itu tanggung jawab caller (lihat banner comment schema.prisma
     * "Task 0.12"). */
    async presignGetUrl(key) {
        if (isLocalMode()) {
            const token = (0, local_storage_util_1.createLocalStorageToken)({ key, exp: Date.now() + PRESIGN_DOWNLOAD_EXPIRY_SECONDS * 1000 }, this.localSigningSecret);
            return `${this.publicBaseUrl}/storage/local/download/${token}`;
        }
        const command = new client_s3_1.GetObjectCommand({ Bucket: this.bucket, Key: key });
        return (0, s3_request_presigner_1.getSignedUrl)(this.client, command, { expiresIn: PRESIGN_DOWNLOAD_EXPIRY_SECONDS });
    }
    /** Otoritatif — dipakai confirm() memvalidasi size/mime SUNGGUHAN yang
     * ter-upload (TDD §11: "divalidasi di server saat confirm, bukan hanya
     * client-side"), bukan klaim client saat presign(). */
    async headObject(key) {
        if (isLocalMode()) {
            try {
                const info = await (0, promises_1.stat)(this.resolveLocalPath(key));
                return { exists: true, sizeBytes: info.size };
            }
            catch {
                return { exists: false };
            }
        }
        try {
            const result = await this.client.send(new client_s3_1.HeadObjectCommand({ Bucket: this.bucket, Key: key }));
            return { exists: true, sizeBytes: result.ContentLength, contentType: result.ContentType };
        }
        catch (err) {
            if (this.isNotFoundError(err))
                return { exists: false };
            throw err;
        }
    }
    async getObjectBuffer(key) {
        if (isLocalMode()) {
            return (0, promises_1.readFile)(this.resolveLocalPath(key));
        }
        const result = await this.client.send(new client_s3_1.GetObjectCommand({ Bucket: this.bucket, Key: key }));
        if (!result.Body) {
            throw new Error(`Object "${key}" tidak punya body.`);
        }
        return Buffer.from(await result.Body.transformToByteArray());
    }
    async putObject(key, body, contentType) {
        if (isLocalMode()) {
            const path = this.resolveLocalPath(key);
            await (0, promises_1.mkdir)((0, node_path_1.dirname)(path), { recursive: true });
            await (0, promises_1.writeFile)(path, body);
            return;
        }
        await this.client.send(new client_s3_1.PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }));
    }
    isNotFoundError(err) {
        if (typeof err !== "object" || err === null)
            return false;
        const name = "name" in err ? err.name : undefined;
        const statusCode = "$metadata" in err ? err.$metadata?.httpStatusCode : undefined;
        return name === "NotFound" || name === "NoSuchKey" || statusCode === 404;
    }
};
exports.ObjectStorageService = ObjectStorageService;
exports.ObjectStorageService = ObjectStorageService = ObjectStorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], ObjectStorageService);
