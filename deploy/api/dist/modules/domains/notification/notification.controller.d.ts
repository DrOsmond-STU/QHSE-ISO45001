import { ListNotificationsQueryDto } from "./dto/list-notifications-query.dto";
import { UpsertPreferenceDto } from "./dto/upsert-preference.dto";
import { NotificationPreferenceService } from "./notification-preference.service";
import { NotificationQueryService } from "./notification-query.service";
export declare class NotificationController {
    private readonly queryService;
    private readonly preferenceService;
    constructor(queryService: NotificationQueryService, preferenceService: NotificationPreferenceService);
    list(query: ListNotificationsQueryDto): Promise<{
        data: {
            priority: import("@prisma/client").$Enums.NotificationPriority;
            id: string;
            tenantId: string;
            createdAt: Date;
            body: string;
            eventType: string;
            recipientUserId: string;
            entityType: string;
            entityId: string;
            title: string;
            isRead: boolean;
            readAt: Date | null;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    unreadCount(): Promise<{
        data: {
            count: number;
        };
    }>;
    markAllAsRead(): Promise<{
        data: {
            count: number;
        };
    }>;
    markAsRead(id: string): Promise<{
        data: {
            priority: import("@prisma/client").$Enums.NotificationPriority;
            id: string;
            tenantId: string;
            createdAt: Date;
            body: string;
            eventType: string;
            recipientUserId: string;
            entityType: string;
            entityId: string;
            title: string;
            isRead: boolean;
            readAt: Date | null;
        };
    }>;
    getPreferences(): Promise<{
        data: {
            categories: readonly import("./event-category").EventCategoryDef[];
            matrix: import("./preference-matrix").PreferenceMatrixCell[];
        };
    }>;
    upsertPreference(dto: UpsertPreferenceDto): Promise<{
        data: import("./preference-matrix").PreferenceMatrixCell;
    }>;
}
