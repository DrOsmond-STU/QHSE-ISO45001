"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// Fixture dev untuk uji manual login (task 0.6/0.7/0.8) — BUKAN endpoint
// provisioning tenant/user sungguhan (itu task 1.5/1.3). Bikin 1 tenant UUID
// fixture, 1 baris password_policies (default), 1 user ACTIVE biasa, DAN 1
// user sysadmin (role SUPER_ADMIN_PLATFORM, task 0.8) dengan MFA sudah
// pre-enrolled langsung via DB.
//
// Bootstrap sysadmin lewat DB (bukan lewat POST /auth/mfa/setup) sengaja:
// task 0.7 mewajibkan MFA tanpa pengecualian untuk sysadmin.* SEBELUM bisa
// login sama sekali — kalau sysadmin PERTAMA harus login dulu untuk
// mengaktifkan MFA, itu deadlock ayam-telur. Provisioning out-of-band
// (seed/CLI admin) adalah jalan keluarnya, konsisten dengan user non-sysadmin
// yang juga belum ada endpoint registrasi sungguhan (Modul 02 / task 1.3).
//
// Jalankan: pnpm --filter @qhse/api exec ts-node -r ts-node/register/transpile-only prisma/seed-auth-dev.ts
require("dotenv/config");
const client_1 = require("@prisma/client");
const argon2 = __importStar(require("argon2"));
const node_crypto_1 = require("node:crypto");
const mfa_service_1 = require("../src/platform/auth/mfa.service");
const seed_rbac_baseline_1 = require("./seed-rbac-baseline");
const FIXTURE_EMAIL = "dev@qhse.local";
const FIXTURE_PASSWORD = "Str0ng!DevPassw0rd";
const SYSADMIN_EMAIL = "sysadmin@qhse.local";
const SYSADMIN_PASSWORD = "Str0ng!SysadminPassw0rd";
async function main() {
    const prisma = new client_1.PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    const mfaService = new mfa_service_1.MfaService();
    const tenantId = (0, node_crypto_1.randomUUID)();
    await prisma.tenant.create({
        data: {
            id: tenantId,
            tenantCode: `DEV-${(0, node_crypto_1.randomUUID)().slice(0, 20)}`,
            legalName: "PT Fixture Dev",
            displayName: "Fixture Dev",
        },
    });
    await prisma.passwordPolicy.create({ data: { tenantId } });
    const passwordHash = await argon2.hash(FIXTURE_PASSWORD, { type: argon2.argon2id });
    const user = await prisma.user.create({
        data: { tenantId, email: FIXTURE_EMAIL, fullName: "Dev Fixture User", status: "ACTIVE", passwordHash },
    });
    const sysadminPasswordHash = await argon2.hash(SYSADMIN_PASSWORD, { type: argon2.argon2id });
    const totpSecret = mfaService.generateSecret();
    const sysadmin = await prisma.user.create({
        data: {
            tenantId,
            email: SYSADMIN_EMAIL,
            fullName: "Dev Fixture Sysadmin",
            status: "ACTIVE",
            passwordHash: sysadminPasswordHash,
            mfaEnabled: true,
            mfaSecretEncrypted: mfaService.encryptSecret(totpSecret),
        },
    });
    await (0, seed_rbac_baseline_1.seedRbacBaseline)(prisma);
    const superAdminRole = await prisma.role.findFirstOrThrow({
        where: { tenantId: null, roleCode: seed_rbac_baseline_1.SUPER_ADMIN_PLATFORM_ROLE_CODE },
    });
    await prisma.userRole.create({
        data: { tenantId, userId: sysadmin.id, roleId: superAdminRole.id, scopeType: "TENANT", scopeId: null },
    });
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
        tenantId,
        user: { userId: user.id, email: FIXTURE_EMAIL, password: FIXTURE_PASSWORD },
        sysadmin: {
            userId: sysadmin.id,
            email: SYSADMIN_EMAIL,
            password: SYSADMIN_PASSWORD,
            totpSecret,
            note: "totpSecret base32 — generate kode 6 digit via otplib authenticator.generate(secret) atau scan provisioningUri di authenticator app.",
        },
    }, null, 2));
    await prisma.$disconnect();
}
main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
});
