"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORGANIZATION_MODULE_CODE = void 0;
// PRD Modul 01 §3 — "module_code untuk modul ini adalah ORG" (permission
// code format module_code.entity.action, Master PRD §8.1). Belum ada
// permission ORG.* terdaftar di role_permissions manapun (authoring RBAC
// penuh Modul 02 = task 1.3) -- konstanta ini disiapkan supaya penamaan
// konsisten begitu endpoint HTTP + @RequirePermission ditambahkan.
exports.ORGANIZATION_MODULE_CODE = "ORG";
//# sourceMappingURL=organization.constants.js.map