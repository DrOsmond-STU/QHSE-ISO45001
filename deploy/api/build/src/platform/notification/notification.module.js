"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationModule = void 0;
const common_1 = require("@nestjs/common");
const observability_module_1 = require("../observability/observability.module");
const tenancy_module_1 = require("../tenancy/tenancy.module");
const notification_delivery_service_1 = require("./notification-delivery.service");
const notification_poll_service_1 = require("./notification-poll.service");
const notification_provider_interface_1 = require("./notification-provider.interface");
const notification_queue_service_1 = require("./notification-queue.service");
const notification_service_1 = require("./notification.service");
const stub_notification_provider_1 = require("./stub-notification.provider");
let NotificationModule = class NotificationModule {
};
exports.NotificationModule = NotificationModule;
exports.NotificationModule = NotificationModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule, observability_module_1.ObservabilityModule],
        providers: [
            stub_notification_provider_1.StubNotificationProvider,
            { provide: notification_provider_interface_1.NOTIFICATION_PROVIDER, useExisting: stub_notification_provider_1.StubNotificationProvider },
            notification_queue_service_1.NotificationQueueService,
            notification_service_1.NotificationService,
            // Diekspor juga di sini (bukan cuma NotificationWorkerModule) supaya
            // test integration apps/api bisa panggil processDeliveryJob() langsung
            // tanpa boot proses worker terpisah — lihat test/notification/.
            notification_delivery_service_1.NotificationDeliveryService,
            // Shared-hosting adaptation (REDIS_ENABLED=false) — pengganti
            // notification.worker.ts, dipicu CronRunnerController (lihat banner
            // comment notification-poll.service.ts).
            notification_poll_service_1.NotificationPollService,
        ],
        exports: [notification_service_1.NotificationService, notification_delivery_service_1.NotificationDeliveryService, notification_poll_service_1.NotificationPollService],
    })
], NotificationModule);
