import { BadRequestException, Controller, Get, NotFoundException, Param, Put, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { Public } from "../auth/public.decorator";
import { ObjectStorageService } from "./object-storage.service";
import { verifyLocalStorageToken } from "./local-storage.util";

// Shared-hosting adaptation (STORAGE_MODE=local) — endpoint tujuan
// uploadUrl/downloadUrl "presigned" yang dihasilkan ObjectStorageService
// mode local (lihat banner comment di sana). @Public() krn caller adalah
// browser client langsung (pola sama presigned S3 URL — otorisasi via
// KEPEMILIKAN TOKEN bertanda tangan HMAC + expiry, BUKAN JWT session), tidak
// pernah dipanggil kalau STORAGE_MODE=s3 (frontend dapat URL S3 asli,
// bukan URL ke controller ini sama sekali).
@Controller("storage/local")
export class LocalStorageController {
  constructor(private readonly storage: ObjectStorageService) {}

  private requireSecret(): string {
    const secret = process.env.LOCAL_STORAGE_SIGNING_SECRET;
    if (!secret) {
      throw new BadRequestException("STORAGE_MODE=local tidak terkonfigurasi (LOCAL_STORAGE_SIGNING_SECRET kosong).");
    }
    return secret;
  }

  @Public()
  @Put("upload/:token")
  async upload(@Param("token") token: string, @Req() req: Request, @Res() res: Response): Promise<void> {
    const payload = verifyLocalStorageToken(token, this.requireSecret());
    if (!payload) {
      throw new BadRequestException("Token upload tidak valid atau sudah kedaluwarsa.");
    }

    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    const body = Buffer.concat(chunks);

    await this.storage.putObject(payload.key, body, payload.contentType ?? "application/octet-stream");
    res.status(200).send();
  }

  @Public()
  @Get("download/:token")
  async download(@Param("token") token: string, @Res() res: Response): Promise<void> {
    const payload = verifyLocalStorageToken(token, this.requireSecret());
    if (!payload) {
      throw new BadRequestException("Token download tidak valid atau sudah kedaluwarsa.");
    }

    try {
      const buffer = await this.storage.getObjectBuffer(payload.key);
      res.status(200).send(buffer);
    } catch {
      throw new NotFoundException("File tidak ditemukan.");
    }
  }
}
