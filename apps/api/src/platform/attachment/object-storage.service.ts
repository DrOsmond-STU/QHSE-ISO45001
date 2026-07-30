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

// TDD §11 — object storage S3-compatible (MinIO on-prem/AWS S3). Dev lokal:
// MinIO portable (.local-minio/, lihat apps/api/scripts/dev-minio-setup.sh
// — sejajar .local-pgsql/.local-redis, pola sama Postgres/Redis 0.2/0.6).

export interface HeadObjectResult {
  exists: boolean;
  sizeBytes?: number;
  contentType?: string;
}

const PRESIGN_UPLOAD_EXPIRY_SECONDS = 15 * 60;
const PRESIGN_DOWNLOAD_EXPIRY_SECONDS = 5 * 60;

@Injectable()
export class ObjectStorageService implements OnModuleInit {
  private readonly logger = new Logger(ObjectStorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.OBJECT_STORAGE_BUCKET ?? "qhse-attachments";
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
   * provisioning jadi kode, bukan binary tambahan.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket "${this.bucket}" dibuat.`);
    }
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
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    return getSignedUrl(this.client, command, { expiresIn: PRESIGN_UPLOAD_EXPIRY_SECONDS });
  }

  /** Dipanggil HANYA setelah caller (AttachmentService) verifikasi
   * scanStatus=CLEAN — presign URL sendiri tidak tahu/tidak enforce status
   * scan, itu tanggung jawab caller (lihat banner comment schema.prisma
   * "Task 0.12"). */
  async presignGetUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: PRESIGN_DOWNLOAD_EXPIRY_SECONDS });
  }

  /** Otoritatif — dipakai confirm() memvalidasi size/mime SUNGGUHAN yang
   * ter-upload (TDD §11: "divalidasi di server saat confirm, bukan hanya
   * client-side"), bukan klaim client saat presign(). */
  async headObject(key: string): Promise<HeadObjectResult> {
    try {
      const result = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return { exists: true, sizeBytes: result.ContentLength, contentType: result.ContentType };
    } catch (err) {
      if (this.isNotFoundError(err)) return { exists: false };
      throw err;
    }
  }

  async getObjectBuffer(key: string): Promise<Buffer> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!result.Body) {
      throw new Error(`Object "${key}" tidak punya body.`);
    }
    return Buffer.from(await result.Body.transformToByteArray());
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }));
  }

  private isNotFoundError(err: unknown): boolean {
    if (typeof err !== "object" || err === null) return false;
    const name = "name" in err ? (err as { name?: unknown }).name : undefined;
    const statusCode =
      "$metadata" in err ? (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode : undefined;
    return name === "NotFound" || name === "NoSuchKey" || statusCode === 404;
  }
}
