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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentCategoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const dms_context_1 = require("./dms-context");
// Task 2.1 (Modul 03 §5) — document_categories CRUD. BELUM ada controller
// HTTP (pola sama 1.1-1.6 utk modul tanpa deliverable apps/web) —
// dms.category.manage sudah di-seed ke RBAC baseline (task ini), siap
// digerbangi @RequirePermission begitu ada endpoint.
let DocumentCategoryService = class DocumentCategoryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(input) {
        const createdBy = (0, dms_context_1.requireActorUserId)();
        const tenantId = (0, dms_context_1.requireTenantId)();
        return (0, dms_context_1.withCleanUniqueViolation)(() => this.prisma.withRls((tx) => tx.documentCategory.create({
            data: { ...input, tenantId, createdBy, updatedBy: createdBy },
        })), `Kode kategori "${input.code}" sudah dipakai di tenant ini.`);
    }
    async listActive() {
        return this.prisma.withRls((tx) => tx.documentCategory.findMany({
            where: { status: "ACTIVE", deletedAt: null },
            orderBy: { name: "asc" },
        }));
    }
    async getById(documentCategoryId) {
        return this.prisma.withRls((tx) => tx.documentCategory.findUniqueOrThrow({ where: { id: documentCategoryId } }));
    }
    async getByCode(code) {
        const tenantId = (0, dms_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.documentCategory.findUnique({ where: { tenantId_code: { tenantId, code } } }));
    }
};
exports.DocumentCategoryService = DocumentCategoryService;
exports.DocumentCategoryService = DocumentCategoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DocumentCategoryService);
