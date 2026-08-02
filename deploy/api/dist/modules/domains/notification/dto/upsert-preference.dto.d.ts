import { NotificationChannelCode, NotificationDeliveryMode } from "@prisma/client";
export declare class UpsertPreferenceDto {
    eventCategory: string;
    channelCode: NotificationChannelCode;
    isEnabled: boolean;
    deliveryMode?: NotificationDeliveryMode;
    quietHoursStart?: string;
    quietHoursEnd?: string;
}
