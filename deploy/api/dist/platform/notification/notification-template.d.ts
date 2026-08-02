/** Nama variabel unik yang direferensikan template — hanya `{{var}}` datar
 * (bukan Handlebars block/helper `{{#if}}` dst., sesuai "variabel
 * terbatasi" TDD §10, bukan mesin templating serba-bisa). */
export declare function extractTemplateVariableNames(template: string): string[];
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
export declare function renderTemplate(template: string, variables: Record<string, string>): string;
