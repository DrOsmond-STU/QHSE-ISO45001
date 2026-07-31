import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, normalize, sep } from "node:path";
import { createLocalStorageToken } from "./local-storage.util";

// TDD §11 — object storage S3-compatible (MinIO on-prem/AWS S3). Dev lokal:
// MinIO portable (.local-minio/, lihat apps/api/scripts/dev-minio-setup.sh
// — sejajar .local-pgsql/.local-redis, pola sama Postgres/Redis 0.2/0.6).
//
// Shared-hosting adaptation — STORAGE_MODE=local (default: s3) mengganti
// seluruh operasi S3Client dengan filesystem lokal (LOCAL_STORAGE_PATH) +
// URL presigned "palsu" (HMAC-signed, lihat local-storage.util.ts) yang
// diarahkan ke LocalStorageController (bukan endpoint S3 sungguhan) —
// dipilih supaya user shared-hosting TIDAK wajib punya akun S3-compatible
// eksternal (Wasabi/R2/Spaces dsb.), meski itu tetap opsi valid (endpoint
// OBJECT_STORAGE_* cukup diarahkan ke provider itu, STORAGE_MODE tetap
// "s3", TIDAK perlu kode ini sama sekali — kode di bawah HANYA aktif kalau
// eksplisit STORAGE_MODE=local).

export interface HeadObjectResult {
  exists: boolean;
  sizeBytes?: number;
  contentType?: string;
}

const PRESIGN_UPLOAD_EXPIRY_SECONDS = 15 * 60;
const PRESIGN_DOWNLOAD_EXPIRY_SECONDS = 5 * 60;

function isLocalMode(): boolean {
  return process.env.STORAGE_MODE === "local";
}

@Injectable()
export class ObjectStorageService implements OnModuleInit {
  private readonly logger = new Logger(ObjectStorageService.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly localRoot: string;
  private readonly localSigningSecret: string;
  private readonly publicBaseUrl: string;

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

    this.client = new S3Client({
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
  async onModuleInit(): Promise<void> {
    if (isLocalMode()) {
      await mkdir(this.localRoot, { recursive: true });
      return;
    }
    try {
      await this.client!.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client!.send(new CreateBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket "${this.bucket}" dibuat.`);
    }
  }

  /** Cegah path traversal (key datang dari attachmentId/fileName yang sudah
   * di-sanitize buildStorageKey(), tapi defense-in-depth kedua di sini —
   * tolak apa pun yang lolos ke luar localRoot setelah normalize()). */
  private resolveLocalPath(key: string): string {
    const full = normalize(join(this.localRoot, key));
    const rootWithSep = normalize(this.localRoot) + sep;
    if (!full.startsWith(normalize(this.localRoot)) || (full !== normalize(this.localRoot) && !full.startsWith(rootWithSep))) {
      throw new Error(`Storage key tidak valid (path traversal terdeteksi): "${key}"`);
    }
    return full;
  }

  /** Key deterministik, tenant-namespaced di path-nya sendiri (defense in
   * depth di luar RLS — RLS melindungi baris `attachments`, bukan object
   * storage; struktur key ini mencegah tenant lain menebak key file
   * tenant lain lewat pola nama yang predictable). */
  buildStorageKey(tenantId: string, attachmentId: string, fileName: string): string {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    return `${tenantId}/${attachmentId}/${safeName}`;
  }

  buildThumbnailKey(storageKey: string): string {
    return `${storageKey}.thumb.jpg`;
  }

  async presignPutUrl(key: string, contentType: string): Promise<string> {
    if (isLocalMode()) {
      const token = createLocalStorageToken(
        { key, contentType, exp: Date.now() + PRESIGN_UPLOAD_EXPIRY_SECONDS * 1000 },
        this.localSigningSecret,
      );
      return `${this.publicBaseUrl}/storage/local/upload/${token}`;
    }
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    return getSignedUrl(this.client!, command, { expiresIn: PRESIGN_UPLOAD_EXPIRY_SECONDS });
  }

  /** Dipanggil HANYA setelah caller (AttachmentService) verifikasi
   * scanStatus=CLEAN — presign URL sendiri tidak tahu/tidak enforce status
   * scan, itu tanggung jawab caller (lihat banner comment schema.prisma
   * "Task 0.12"). */
  async presignGetUrl(key: string): Promise<string> {
    if (isLocalMode()) {
      const token = createLocalStorageToken({ key, exp: Date.now() + PRESIGN_DOWNLOAD_EXPIRY_SECONDS * 1000 }, this.localSigningSecret);
      return `${this.publicBaseUrl}/storage/local/download/${token}`;
    }
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client!, command, { expiresIn: PRESIGN_DOWNLOAD_EXPIRY_SECONDS });
  }

  /** Otoritatif — dipakai confirm() memvalidasi size/mime SUNGGUHAN yang
   * ter-upload (TDD §11: "divalidasi di server saat confirm, bukan hanya
   * client-side"), bukan klaim client saat presign(). */
  async headObject(key: string): Promise<HeadObjectResult> {
    if (isLocalMode()) {
      try {
        const info = await stat(this.resolveLocalPath(key));
        return { exists: true, sizeBytes: info.size };
      } catch {
        return { exists: false };
      }
    }
    try {
      const result = await this.client!.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return { exists: true, sizeBytes: result.ContentLength, contentType: result.ContentType };
    } catch (err) {
      if (this.isNotFoundError(err)) return { exists: false };
      throw err;
    }
  }

  async getObjectBuffer(key: string): Promise<Buffer> {
    if (isLocalMode()) {
      return readFile(this.resolveLocalPath(key));
    }
    const result = await this.client!.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!result.Body) {
      throw new Error(`Object "${key}" tidak punya body.`);
    }
    return Buffer.from(await result.Body.transformToByteArray());
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    if (isLocalMode()) {
      const path = this.resolveLocalPath(key);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, body);
      return;
    }
    await this.client!.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }));
  }

  private isNotFoundError(err: unknown): boolean {
    if (typeof err !== "object" || err === null) return false;
    const name = "name" in err ? (err as { name?: unknown }).name : undefined;
    const statusCode =
      "$metadata" in err ? (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode : undefined;
    return name === "NotFound" || name === "NoSuchKey" || statusCode === 404;
  }
}
