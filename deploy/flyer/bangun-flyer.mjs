// Membangun flyer satu halaman: menanam huruf + tangkapan layar ke dalam
// flyer.src.html, lalu merender hasilnya ke PDF dan PNG lewat Chromium.
//
// KENAPA DITANAM, BUKAN DITAUTKAN
// Flyer dikirim sebagai berkas — lewat surel, WhatsApp, atau dicetak. Berkas
// yang menautkan huruf ke fonts.gstatic.com dan gambar ke berkas sebelah akan
// tampil dengan huruf cadangan dan kotak gambar kosong begitu ia berpindah
// komputer, dan itu justru terjadi pada satu-satunya saat berkas ini penting.
//
// PEMAKAIAN
//   node deploy/flyer/bangun-flyer.mjs \
//     --playwright <dir yang memuat node_modules/playwright-core> \
//     --gambar <tangkapan-layar.png> \
//     --huruf  <berkas .woff2 Plus Jakarta Sans> \
//     --keluar <direktori keluaran>
//
// Tangkapan layarnya diambil dari aplikasi yang BERJALAN, bukan digambar
// ulang: flyer yang memuat mock-up memperlihatkan produk yang belum tentu ada.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DI_SINI = dirname(fileURLToPath(import.meta.url));

function arg(nama, bawaan) {
  const i = process.argv.indexOf(`--${nama}`);
  if (i === -1 || i === process.argv.length - 1) {
    if (bawaan !== undefined) return bawaan;
    throw new Error(`--${nama} wajib diisi`);
  }
  return process.argv[i + 1];
}

const pwDir = arg("playwright");
const berkasGambar = resolve(arg("gambar"));
const berkasHuruf = resolve(arg("huruf"));
const keluar = resolve(arg("keluar", resolve(DI_SINI, "keluaran")));
const CHROME = arg("chrome", "/opt/pw-browsers/chromium-1194/chrome-linux/chrome");

mkdirSync(keluar, { recursive: true });

// Satu berkas variabel meliputi seluruh bobot 200–800. Mendaftarkan
// `font-weight: 200 800` pada satu @font-face — bukan lima @font-face yang
// menunjuk berkas yang sama — mencegah Chromium menebalkan sendiri huruf yang
// diminta tebal (synthetic bold), yang hasilnya berbeda dari tebal aslinya.
const huruf = readFileSync(berkasHuruf).toString("base64");
const cssHuruf =
  `@font-face{font-family:'Plus Jakarta Sans';font-style:normal;` +
  `font-weight:200 800;font-display:block;` +
  `src:url(data:font/woff2;base64,${huruf}) format('woff2');}`;

const gambar = `data:image/png;base64,${readFileSync(berkasGambar).toString("base64")}`;

let html = readFileSync(resolve(DI_SINI, "flyer.src.html"), "utf8");
for (const [tanda, isi] of [["/*FONT*/", cssHuruf], ["/*GAMBAR*/", gambar]]) {
  if (!html.includes(tanda)) throw new Error(`penanda ${tanda} tidak ada di flyer.src.html`);
  html = html.replace(tanda, isi);
}
const berkasHtml = resolve(keluar, "flyer.html");
writeFileSync(berkasHtml, html);

const { chromium } = await import(`${resolve(pwDir)}/node_modules/playwright-core/index.mjs`);
const peramban = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
const halaman = await peramban.newPage({ viewport: { width: 1240, height: 1754 }, deviceScaleFactor: 2 });

// setContent, bukan goto(file://): berkasnya sudah berdiri sendiri, dan
// memuatnya lewat file:// menambah satu aturan asal-usul yang tidak perlu.
await halaman.setContent(html, { waitUntil: "load" });
await halaman.evaluate(() => document.fonts.ready);
await halaman.waitForTimeout(400);

await halaman.pdf({
  path: resolve(keluar, "flyer.pdf"),
  format: "A4",
  printBackground: true,
  // Marginnya nol karena .lembar sudah berukuran tepat A4 dan mengurus
  // paddingnya sendiri. Margin dari sini akan MENYUSUTKAN isinya sehingga
  // halamannya meluber jadi dua.
  margin: { top: "0", right: "0", bottom: "0", left: "0" },
});

// PNG untuk ditempel ke pesan atau salindia; sekaligus alat periksa cepat
// apakah isinya benar-benar muat satu halaman.
const lembar = await halaman.$(".lembar");
await lembar.screenshot({ path: resolve(keluar, "flyer.png") });

const tinggi = await halaman.evaluate(() => {
  const el = document.querySelector(".lembar");
  return { isi: el.scrollHeight, muat: el.clientHeight };
});
await peramban.close();

console.log(`html : ${berkasHtml}`);
console.log(`pdf  : ${resolve(keluar, "flyer.pdf")}`);
console.log(`png  : ${resolve(keluar, "flyer.png")}`);
console.log(
  tinggi.isi > tinggi.muat
    ? `PERINGATAN: isi ${tinggi.isi}px melebihi halaman ${tinggi.muat}px — ada yang terpotong`
    : `muat satu halaman (isi ${tinggi.isi}px dari ${tinggi.muat}px)`,
);
