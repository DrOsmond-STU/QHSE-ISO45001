import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from "@nestjs/common";
import { RequirePermission } from "../../../platform/rbac/require-permission.decorator";
import { ListNotificationsQueryDto } from "./dto/list-notifications-query.dto";
import { UpsertPreferenceDto } from "./dto/upsert-preference.dto";
import { EVENT_CATEGORIES } from "./event-category";
import { NotificationPreferenceService } from "./notification-preference.service";
import { NotificationQueryService } from "./notification-query.service";

// Modul 25 §12 — endpoint HTTP PERTAMA utk domain notification (0.11
// SENGAJA cuma enqueue()/delivery, tidak ada controller — lihat banner
// comment NotificationQueryService). Tidak ada @CurrentUser() di sini —
// service layer baca userId/tenantId dari tenantContextStorage ambient
// (diisi TenantContextMiddleware, jalan SEBELUM controller method apa
// pun, pola sama seluruh service lain di codebase ini), bukan diteruskan
// eksplisit dari controller. SELURUH endpoint scope "milik sendiri" (PRD
// §3, notification.read/notification.preference.manage keduanya
// self-scope) — tidak ada varian admin/lintas-user di modul ini.
@Controller("notifications")
export class NotificationController {
  constructor(
    private readonly queryService: NotificationQueryService,
    private readonly preferenceService: NotificationPreferenceService,
  ) {}

  @RequirePermission("notification.read")
  @Get()
  async list(@Query() query: ListNotificationsQueryDto) {
    const result = await this.queryService.listForCurrentUser(query);
    return { data: result.data, meta: result.meta };
  }

  @RequirePermission("notification.read")
  @Get("unread-count")
  async unreadCount() {
    const count = await this.queryService.unreadCount();
    return { data: { count } };
  }

  @RequirePermission("notification.read")
  @Post("read-all")
  @HttpCode(HttpStatus.OK)
  async markAllAsRead() {
    const result = await this.queryService.markAllAsRead();
    return { data: result };
  }

  @RequirePermission("notification.read")
  @Post(":id/read")
  @HttpCode(HttpStatus.OK)
  async markAsRead(@Param("id") id: string) {
    const notification = await this.queryService.markAsRead(id);
    return { data: notification };
  }

  @RequirePermission("notification.preference.manage")
  @Get("preferences")
  async getPreferences() {
    const matrix = await this.preferenceService.getMatrixForCurrentUser();
    return { data: { categories: EVENT_CATEGORIES, matrix } };
  }

  @RequirePermission("notification.preference.manage")
  @Put("preferences")
  async upsertPreference(@Body() dto: UpsertPreferenceDto) {
    const cell = await this.preferenceService.upsertPreference(dto);
    return { data: cell };
  }
}
