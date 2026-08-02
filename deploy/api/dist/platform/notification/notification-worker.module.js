"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationWorkerModule = void 0;
const common_1 = require("@nestjs/common");
const tenancy_module_1 = require("../tenancy/tenancy.module");
const notification_delivery_service_1 = require("./notification-delivery.service");
const notification_provider_interface_1 = require("./notification-provider.interface");
const stub_notification_provider_1 = require("./stub-notification.provider");
// Modul SLIM khusus proses worker (apps/worker) — TIDAK ada HTTP/guard/JWT,
// cuma yang genuinely dibutuhkan NotificationDeliveryService. TIDAK
// termasuk NotificationQueueService (producer BullMQ, cuma dipakai sisi
// apps/api enqueue()) — worker CUMA konsumen job, tidak pernah bikin job
// baru. Pola sama persis workflow-engine-worker.module.ts (task 0.9).
let NotificationWorkerModule = class NotificationWorkerModule {
};
exports.NotificationWorkerModule = NotificationWorkerModule;
exports.NotificationWorkerModule = NotificationWorkerModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule],
        providers: [
            stub_notification_provider_1.StubNotificationProvider,
            { provide: notification_provider_interface_1.NOTIFICATION_PROVIDER, useExisting: stub_notification_provider_1.StubNotificationProvider },
            notification_delivery_service_1.NotificationDeliveryService,
        ],
        exports: [notification_delivery_service_1.NotificationDeliveryService],
    })
], NotificationWorkerModule);
//# sourceMappingURL=notification-worker.module.js.map