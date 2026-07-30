import id from "./dictionaries/id.json";
import en from "./dictionaries/en.json";

export type Locale = "id" | "en";

const dictionaries: Record<Locale, Record<string, string>> = { id, en };

// Default ID (DESIGN.md — bilingual ID default, EN sebagai alternatif).
// Task 1.7 — parameter `vars` ditambahkan (BEYOND desain awal 3-key ini,
// yang belum py konsumen apa pun butuh string dinamis) — mustache-style
// `{{var}}`, pola SAMA persis renderTemplate() sisi backend
// (platform/notification/notification-template.ts, 0.11) demi konsistensi
// konvensi placeholder lintas platform. TIDAK perlu HTML-escaping di sini
// (beda dari backend, yang me-render ke email/WhatsApp mentah) — nilai
// selalu dirender React sbg text content, React sendiri sudah aman dari
// XSS utk itu.
export function t(key: string, locale: Locale = "id", vars?: Record<string, string | number>): string {
  const template = dictionaries[locale][key] ?? key;
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, varName: string) => (varName in vars ? String(vars[varName]) : match));
}

export { id, en };
