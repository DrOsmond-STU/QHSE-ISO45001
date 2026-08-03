// Pembuat PDF satu halaman, ditulis byte per byte.
//
// KENAPA TANPA PUSTAKA. Data demo menunjuk berkas yang tidak pernah ada, jadi
// penampil dokumen selalu kosong saat presentasi — persis modul yang paling
// ingin ditunjukkan. Yang dibutuhkan untuk memperbaikinya hanyalah PDF satu
// halaman berisi teks, dan itu beberapa puluh baris aritmetika offset. Menarik
// pdfkit ke dalam demo-api berarti menambah dependensi (dan langkah build)
// pada proses yang sengaja hanya bergantung pada pg dan argon2.
//
// PDF-nya sengaja SEDERHANA dan JUJUR: ia menyatakan dirinya berkas contoh.
// Menyalin teks prosedur sungguhan ke dalamnya akan menghasilkan dokumen yang
// terlihat resmi padahal isinya karangan — dan dokumen semacam itu punya
// kebiasaan buruk keluar dari lingkungan demo.

/** Teks di dalam PDF memakai encoding WinAnsi; karakter di luar Latin-1 tidak
 *  punya representasi pada font standar Helvetica. Diganti padanan ASCII-nya
 *  alih-alih dibiarkan jadi karakter kotak. */
function toWinAnsi(text) {
  return String(text)
    .replace(/[—–]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/·/g, "-")
    .replace(/[^\x20-\x7e]/g, "?");
}

/** Kurung dan garis miring terbalik adalah pembatas string di PDF. */
function escapePdfText(text) {
  return toWinAnsi(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/**
 * @param lines array of { text, size, bold, gap } — digambar dari atas ke
 *        bawah pada halaman A4.
 */
function simplePdf(lines) {
  const A4_WIDTH = 595;
  const A4_HEIGHT = 842;
  const MARGIN = 56;

  let y = A4_HEIGHT - MARGIN;
  const parts = ["BT"];
  for (const line of lines) {
    const size = line.size || 11;
    y -= line.gap === undefined ? size + 6 : line.gap;
    parts.push(`/${line.bold ? "F2" : "F1"} ${size} Tf`);
    parts.push(`1 0 0 1 ${MARGIN} ${y} Tm`);
    parts.push(`(${escapePdfText(line.text)}) Tj`);
  }
  parts.push("ET");
  const content = parts.join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH} ${A4_HEIGHT}] ` +
      `/Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  ];

  // Tabel xref menuntut offset byte MUTLAK setiap objek, jadi berkasnya
  // dirakit sambil menghitung — bukan disusun lalu dicari offsetnya, yang akan
  // meleset satu byte setiap kali panjang teksnya berubah.
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}

module.exports = { simplePdf };
