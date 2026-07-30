import { Controller, Get, Param, ParseUUIDPipe, Post, Body } from "@nestjs/common";
import { AttachmentService } from "./attachment.service";
import { CurrentUser, RequestUser } from "../auth/current-user.decorator";
import { ConfirmAttachmentDto } from "./dto/confirm-attachment.dto";
import { PresignAttachmentDto } from "./dto/presign-attachment.dto";

// TDD §11 — endpoint HTTP PERTAMA di platform/* (numbering 0.10 & notification
// 0.11 murni in-process, tidak ada controller) karena browser klien perlu
// memanggil presign/confirm langsung, upload sungguhan terjadi DI BROWSER ke
// object storage (bukan lewat backend — TDD §11: "menghindari bottleneck").
// Otorisasi granular per-entity (mis. "boleh attach ke Work Permit INI")
// TIDAK dicek di sini — itu tanggung jawab modul domain (Phase 1+) yang
// memanggil/menge-mount attachment ke entity-nya, sama seperti
// NumberingService/WorkflowEngineService tidak mengecek otorisasi
// domain-spesifik. JwtAuthGuard global (fail-closed) sudah cukup untuk
// task 0.12 murni infra.
@Controller("attachments")
export class AttachmentController {
  constructor(private readonly attachmentService: AttachmentService) {}

  @Post("presign")
  async presign(@Body() dto: PresignAttachmentDto) {
    const result = await this.attachmentService.presign(dto);
    return { data: result };
  }

  @Post("confirm")
  async confirm(@Body() dto: ConfirmAttachmentDto, @CurrentUser() user: RequestUser) {
    const result = await this.attachmentService.confirm(dto, user.userId);
    return { data: result };
  }

  @Get(":id/download")
  async download(@Param("id", ParseUUIDPipe) id: string) {
    const result = await this.attachmentService.getDownloadUrl(id);
    return { data: result };
  }
}
