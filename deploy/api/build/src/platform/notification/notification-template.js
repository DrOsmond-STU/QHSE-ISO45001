"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTemplateVariableNames = extractTemplateVariableNames;
exports.renderTemplate = renderTemplate;
const handlebars_1 = __importDefault(require("handlebars"));
// Pure logic — tanpa Prisma/DB, mirror gaya numbering-pattern.ts (task 0.10).
const TEMPLATE_VARIABLE_PATTERN = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
/** Nama variabel unik yang direferensikan template — hanya `{{var}}` datar
 * (bukan Handlebars block/helper `{{#if}}` dst., sesuai "variabel
 * terbatasi" TDD §10, bukan mesin templating serba-bisa). */
function extractTemplateVariableNames(template) {
    const names = new Set();
    for (const match of template.matchAll(TEMPLATE_VARIABLE_PATTERN)) {
        names.add(match[1]);
    }
    return [...names];
}
/**
 * TDD §10 — template engine (Handlebars) dengan variabel TERBATASI
 * (whitelist) untuk mencegah injection saat merender data user-generated:
 * setiap `{{variable}}` yang direferensikan template WAJIB ada di
 * `variables` yang disuplai caller (event trigger dari modul domain) —
 * kalau tidak, throw eksplisit (fail loud, pola sama numbering-pattern.ts
 * task 0.10) alih-alih merender kosong/`undefined` diam-diam ke pesan yang
 * akan dikirim ke user sungguhan. `strict: true` Handlebars sebagai lapis
 * kedua (defense in depth); escaping HTML default AKTIF (`{{var}}` bukan
 * `{{{var}}}`) supaya data user-generated (mis. deskripsi insiden) tidak
 * bisa inject markup ke body email/HTML.
 */
function renderTemplate(template, variables) {
    const referenced = extractTemplateVariableNames(template);
    const unresolved = referenced.filter((name) => !(name in variables));
    if (unresolved.length > 0) {
        throw new Error(`Template mereferensikan variabel yang tidak di-whitelist/tidak disuplai: ${unresolved.join(", ")}.`);
    }
    const compiled = handlebars_1.default.compile(template, { noEscape: false, strict: true });
    return compiled(variables);
}
