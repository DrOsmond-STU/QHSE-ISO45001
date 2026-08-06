// Memastikan setiap label di lib/modules.ts punya padanan Inggris.
//
//   node scripts/check-i18n.mjs
//
// Ini yang membuat kamus berkunci-teks di lib/modules-en.ts aman dipakai.
// Tanpa langkah ini, menambah modul ke-20 dalam bahasa Indonesia akan
// menghasilkan antarmuka Inggris yang setengah Indonesia — dan tidak ada
// satu pun galat yang muncul, karena resolvernya memang jatuh kembali ke
// teks aslinya. Kegagalan yang jatuh kembali dengan anggun adalah kegagalan
// yang tidak pernah diperbaiki siapa pun.
//
// Membaca berkasnya sebagai TEKS, bukan mengimpornya: modules.ts adalah
// TypeScript, dan menjalankannya dari skrip Node polos menuntut satu langkah
// kompilasi yang tidak sepadan untuk pemeriksaan sesederhana ini.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const modulesPath = join(here, "..", "lib", "modules.ts");
const kamusPath = join(here, "..", "lib", "modules-en.ts");

const modulesSrc = readFileSync(modulesPath, "utf8");
const kamusSrc = readFileSync(kamusPath, "utf8");

// Kunci kamus: baik yang berkutip maupun yang tidak (properti satu kata
// ditulis tanpa kutip oleh pemformat).
const kunci = new Set();
for (const m of kamusSrc.matchAll(/^\s{2}"((?:[^"\\]|\\.)*)":/gm)) kunci.add(m[1]);
for (const m of kamusSrc.matchAll(/^\s{2}([A-Za-zÀ-ÿ][\w]*):/gm)) kunci.add(m[1]);

// Kunci yang nilainya membentang dua baris ikut tertangkap pola pertama, jadi
// tidak perlu penanganan khusus.

const labels = new Set();
for (const m of modulesSrc.matchAll(/(?:header|label|title|emptyMessage|group|moduleNumber):\s*"((?:[^"\\]|\\.)*)"/g)) {
  labels.add(m[1]);
}

const hilang = [...labels].filter((label) => !kunci.has(label)).sort();
// Kunci kamus yang tidak lagi dipakai ikut dilaporkan, tapi TIDAK
// menggagalkan: label bisa saja dipakai di tempat lain, dan kamus yang
// menolak entri berlebih akan menghukum orang yang membersihkan modul.
const menganggur = [...kunci].filter((k) => !labels.has(k)).sort();

console.log(`label modules.ts : ${labels.size}`);
console.log(`kunci kamus      : ${kunci.size}`);
if (menganggur.length > 0) {
  console.log(`\ncatatan: ${menganggur.length} kunci kamus tidak dipakai modules.ts`);
  for (const k of menganggur) console.log(`  - ${k}`);
}

if (hilang.length > 0) {
  console.log(`\n${hilang.length} LABEL BELUM PUNYA PADANAN INGGRIS:`);
  for (const label of hilang) console.log(`  "${label}": "",`);
  process.exit(1);
}

console.log("\nsemua label punya padanan Inggris.");
