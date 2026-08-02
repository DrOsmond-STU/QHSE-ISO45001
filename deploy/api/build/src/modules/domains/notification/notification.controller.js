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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const common_1 = require("@nestjs/common");
const require_permission_decorator_1 = require("../../../platform/rbac/require-permission.decorator");
const list_notifications_query_dto_1 = require("./dto/list-notifications-query.dto");
const upsert_preference_dto_1 = require("./dto/upsert-preference.dto");
const event_category_1 = require("./event-category");
const notification_preference_service_1 = require("./notification-preference.service");
const notification_query_service_1 = require("./notification-query.service");
// Modul 25 §12 — endpoint HTTP PERTAMA utk domain notification (0.11
// SENGAJA cuma enqueue()/delivery, tidak ada controller — lihat banner
// comment NotificationQueryService). Tidak ada @CurrentUser() di sini —
// service layer baca userId/tenantId dari tenantContextStorage ambient
// (diisi TenantContextMiddleware, jalan SEBELUM controller method apa
// pun, pola sama seluruh service lain di codebase ini), bukan diteruskan
// eksplisit dari controller. SELURUH endpoint scope "milik sendiri" (PRD
// §3, notification.read/notification.preference.manage keduanya
// self-scope) — tidak ada varian admin/lintas-user di modul ini.
let NotificationController = class NotificationController {
    queryService;
    preferenceService;
    constructor(queryService, preferenceService) {
        this.queryService = queryService;
        this.preferenceService = preferenceService;
    }
    async list(query) {
        const result = await this.queryService.listForCurrentUser(query);
        return { data: result.data, meta: result.meta };
    }
    async unreadCount() {
        const count = await this.queryService.unreadCount();
        return { data: { count } };
    }
    async markAllAsRead() {
        const result = await this.queryService.markAllAsRead();
        return { data: result };
    }
    async markAsRead(id) {
        const notification = await this.queryService.markAsRead(id);
        return { data: notification };
    }
    async getPreferences() {
        const matrix = await this.preferenceService.getMatrixForCurrentUser();
        return { data: { categories: event_category_1.EVENT_CATEGORIES, matrix } };
    }
    async upsertPreference(dto) {
        const cell = await this.preferenceService.upsertPreference(dto);
        return { data: cell };
    }
};
exports.NotificationController = NotificationController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)("notification.read"),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_notifications_query_dto_1.ListNotificationsQueryDto]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "list", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)("notification.read"),
    (0, common_1.Get)("unread-count"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "unreadCount", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)("notification.read"),
    (0, common_1.Post)("read-all"),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "markAllAsRead", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)("notification.read"),
    (0, common_1.Post)(":id/read"),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "markAsRead", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)("notification.preference.manage"),
    (0, common_1.Get)("preferences"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getPreferences", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)("notification.preference.manage"),
    (0, common_1.Put)("preferences"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [upsert_preference_dto_1.UpsertPreferenceDto]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "upsertPreference", null);
exports.NotificationController = NotificationController = __decorate([
    (0, common_1.Controller)("notifications"),
    __metadata("design:paramtypes", [notification_query_service_1.NotificationQueryService,
        notification_preference_service_1.NotificationPreferenceService])
], NotificationController);
