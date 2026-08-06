// Lapisan AI: perluasan kata kunci, rekomendasi peraturan, dan usulan susunan
// dokumen. Satu-satunya berkas yang berbicara dengan model.
//
// TIGA ATURAN YANG MEMBENTUK SELURUH BERKAS INI
//
// 1. MODEL TIDAK PERNAH MENJAWAB PERTANYAAN TENTANG DATA TENANT.
//    Dokumen dan peraturan milik perusahaan dicari di basis data (search.js).
//    Model hanya memperluas kata kuncinya lebih dulu. Yang ditebak adalah
//    pertanyaannya, bukan jawabannya — karena jawaban yang salah tentang
//    prosedur yang harus diikuti orang jauh lebih mahal daripada pencarian
//    yang meleset.
//
// 2. NOMOR PERATURAN TIDAK BOLEH DIKARANG.
//    Rekomendasi peraturan dari internet WAJIB lewat alat pencarian web, dan
//    setiap butir wajib membawa tautan sumbernya. Nomor peraturan yang
//    terdengar meyakinkan tapi tidak ada — "Permenaker No. 12 Tahun 2019" —
//    yang lalu dikutip sebagai dasar hukum di dokumen terkendali adalah
//    persis kegagalan yang paling mahal di aplikasi kepatuhan. Butir tanpa
//    URL dibuang di sini, sebelum sempat sampai ke layar.
//
// 3. TANPA KUNCI API, FITURNYA DIAM — BUKAN BERPURA-PURA.
//    Kalau ANTHROPIC_API_KEY kosong, rute AI menjawab 503 dengan penjelasan.
//    Pencarian internal tetap jalan penuh tanpanya. Menyulap keluaran palsu
//    supaya demo tetap "hidup" berarti menanam kebohongan di aplikasi yang
//    seluruh gunanya adalah bisa dipercaya.
const Anthropic = require("@anthropic-ai/sdk");

// Opus 5 dipakai untuk ketiganya. Perluasan kata kunci memang tugas ringan,
// tapi memakai model berbeda per rute berarti dua perilaku yang harus
// dipahami dan dua tagihan yang harus ditelusuri; volumenya di aplikasi ini
// terlalu kecil untuk sepadan.
const MODEL = process.env.QHSE_AI_MODEL || "claude-opus-5";

// Batas keluaran. Dipakai apa adanya karena ketiga rute menghasilkan JSON
// pendek, bukan prosa panjang; streaming tidak diperlukan di bawah ini.
const MAX_TOKENS = 8000;

class AiError extends Error {
  constructor(status, title, detail) {
    super(title);
    this.status = status;
    this.title = title;
    this.detail = detail;
  }
}

let klien = null;

/** Kunci dibaca saat dipakai, bukan saat modul dimuat, supaya menambahkan
 *  kunci ke ~/qhse-secrets.sh cukup diikuti restart proses — tanpa perlu
 *  memasang ulang aplikasinya. */
function client() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AiError(
      503,
      "Fitur AI belum diaktifkan.",
      "ANTHROPIC_API_KEY belum disetel di server, jadi pemanggilan model tidak bisa dilakukan. Pencarian dokumen dan peraturan milik perusahaan tetap berjalan tanpa kunci ini.",
    );
  }
  if (!klien) klien = new Anthropic();
  return klien;
}

function aktif() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Ambil teks dari respons.
 *
 * Blok non-teks (thinking, hasil pencarian web) DILEWATI, bukan diperlakukan
 * sebagai galat: respons yang memakai alat server selalu memuat blok jenis
 * lain, dan kode yang membaca content[0].text buta akan mengambil blok yang
 * salah begitu alatnya dipakai.
 */
function teksDari(response) {
  return response.content
    .filter((blok) => blok.type === "text")
    .map((blok) => blok.text)
    .join("\n")
    .trim();
}

/** Respons keluaran terstruktur tetap berupa teks JSON; parse-nya dijaga
 *  supaya JSON cacat menjadi galat yang bisa dibaca, bukan lemparan mentah. */
function jsonDari(response, konteks) {
  const teks = teksDari(response);
  try {
    return JSON.parse(teks);
  } catch {
    throw new AiError(502, "Jawaban model tidak bisa dibaca.", `${konteks}: keluaran bukan JSON yang sah.`);
  }
}

/**
 * Periksa alasan berhenti SEBELUM membaca isinya.
 *
 * `refusal` datang sebagai HTTP 200 dengan content kosong atau separuh, jadi
 * kode yang langsung membaca content akan meledak atau — lebih buruk —
 * menampilkan jawaban yang terpotong seolah utuh.
 */
function pastikanSelesai(response, konteks) {
  if (response.stop_reason === "refusal") {
    throw new AiError(
      422,
      "Permintaan ditolak oleh pengaman model.",
      `${konteks}: coba susun kata kuncinya dengan kalimat yang lebih netral.`,
    );
  }
  if (response.stop_reason === "max_tokens") {
    throw new AiError(502, "Jawaban model terpotong.", `${konteks}: batas keluaran tercapai sebelum selesai.`);
  }
}

// --- 1. Perluasan kata kunci -------------------------------------------------

const SKEMA_PERLUASAN = {
  type: "object",
  properties: {
    istilah: {
      type: "array",
      items: { type: "string" },
      description: "Istilah pencarian tambahan, masing-masing 1-4 kata.",
    },
    catatan: {
      type: "string",
      description: "Satu kalimat singkat: apa yang dipahami dari kata kunci itu.",
    },
  },
  required: ["istilah", "catatan"],
  additionalProperties: false,
};

/**
 * Perluas kata kunci menjadi istilah sepadan yang mungkin dipakai di dokumen.
 *
 * Ini satu-satunya tempat pengetahuan bahasa dibutuhkan: "APD" dan "alat
 * pelindung diri" adalah hal yang sama, "LOTO" ditulis panjang sebagai
 * "lock out tag out", dan dokumen Indonesia kerap menyelipkan istilah
 * Inggrisnya di dalam kurung. Daftar sinonim yang ditulis tangan akan selalu
 * ketinggalan; model tahu padanan yang tidak pernah kita daftarkan.
 *
 * Hasilnya TIDAK LANGSUNG DIPERCAYA: search.js memperlakukan istilah hasil
 * perluasan lebih ketat daripada kata yang diketik pengguna, sehingga
 * perluasan yang meleset tidak bisa menggeser hasil yang benar.
 */
async function perluasKataKunci(frasa) {
  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 1500,
    output_config: {
      format: { type: "json_schema", schema: SKEMA_PERLUASAN },
      // Tugas mekanis dengan jawaban pendek; effort tinggi di sini hanya
      // menambah latensi pada kotak pencarian yang harus terasa cepat.
      effort: "low",
    },
    system:
      "Anda membantu pencarian dokumen K3, mutu, dan lingkungan di perusahaan minyak dan gas Indonesia. " +
      "Diberi satu kata kunci, sebutkan istilah lain yang kemungkinan dipakai untuk hal yang sama di dalam dokumen: " +
      "kepanjangan dari singkatan, singkatan dari kepanjangan, padanan bahasa Inggris yang lazim ditulis di dalam kurung, " +
      "dan nama alat atau kegiatan yang identik. " +
      "Jangan menyebut istilah yang hanya berhubungan longgar — istilah yang terlalu luas justru merusak hasil pencarian. " +
      "Paling banyak 6 istilah. Jawab dalam bahasa Indonesia.",
    messages: [{ role: "user", content: `Kata kunci: ${frasa}` }],
  });
  pastikanSelesai(response, "perluasan kata kunci");
  const hasil = jsonDari(response, "perluasan kata kunci");
  return {
    istilah: (hasil.istilah || []).filter((t) => typeof t === "string" && t.trim()).slice(0, 6),
    catatan: hasil.catatan || "",
  };
}

// --- 2. Rekomendasi peraturan dari internet ----------------------------------

/**
 * Cari peraturan Indonesia yang relevan DI INTERNET, lewat alat pencarian web.
 *
 * KENAPA ALAT PENCARIAN WEB, BUKAN INGATAN MODEL. Ditanya begitu saja, model
 * akan menyebut nomor peraturan dari ingatannya — dan nomor peraturan adalah
 * jenis fakta yang paling mudah tertukar: angka, tahun, dan instansi
 * penerbitnya mirip satu sama lain. Di aplikasi kepatuhan, satu nomor keliru
 * yang tersalin ke dasar hukum dokumen terkendali akan bertahan bertahun-tahun
 * dan baru ketahuan saat audit.
 *
 * Dengan pencarian web, setiap butir membawa URL yang bisa dibuka dan
 * diperiksa sendiri oleh pengguna. Butir tanpa URL dibuang.
 *
 * Keluarannya TIDAK memakai skema JSON, karena keluaran terstruktur dan alat
 * server tidak dipakai bersamaan di sini; formatnya diminta lewat instruksi
 * dan diurai dengan penjagaan.
 */
async function rekomendasiPeraturan(frasa) {
  const response = await client().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    output_config: { effort: "medium" },
    tools: [
      {
        type: "web_search_20260209",
        name: "web_search",
        max_uses: 6,
        // Dibatasi ke situs resmi dan sumber hukum yang lazim dipakai
        // praktisi. Tanpa batas ini, hasil teratas untuk "peraturan K3"
        // sering berupa blog pelatihan yang menyalin nomor dengan keliru.
        allowed_domains: [
          "peraturan.go.id",
          "peraturan.bpk.go.id",
          "jdih.kemnaker.go.id",
          "jdih.esdm.go.id",
          "jdihn.go.id",
          "kemnaker.go.id",
          "menlhk.go.id",
          "setneg.go.id",
          "bpk.go.id",
        ],
        user_location: { type: "approximate", country: "ID" },
      },
    ],
    system:
      "Anda membantu praktisi QHSE di Indonesia menemukan peraturan perundang-undangan yang relevan dengan sebuah topik. " +
      "Cari di internet lebih dulu, lalu laporkan HANYA peraturan yang benar-benar Anda temukan pada hasil pencarian. " +
      "JANGAN menyebut nomor peraturan dari ingatan. Jika tidak menemukan apa pun yang meyakinkan, kembalikan daftar kosong — " +
      "daftar kosong jauh lebih berguna daripada nomor peraturan yang keliru.\n\n" +
      "Jawab HANYA dengan JSON, tanpa teks lain, berbentuk:\n" +
      '{"peraturan":[{"nomor":"...","judul":"...","penerbit":"...","tahun":2021,"url":"https://...","relevansi":"satu kalimat kenapa relevan"}]}\n' +
      "Maksimal 6 butir. Isi setiap kolom dari sumber yang Anda buka; kolom url wajib berupa tautan yang benar-benar ada di hasil pencarian.",
    messages: [
      {
        role: "user",
        content: `Topik: ${frasa}\n\nCari peraturan perundang-undangan Indonesia yang mengatur topik ini.`,
      },
    ],
  });
  pastikanSelesai(response, "rekomendasi peraturan");

  const teks = teksDari(response);
  // Model kadang membungkus JSON dalam blok kode meski diminta tidak; potong
  // pagar kode sebelum diurai daripada menolak jawaban yang sebenarnya benar.
  const bersih = teks.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  let hasil;
  try {
    hasil = JSON.parse(bersih);
  } catch {
    throw new AiError(502, "Jawaban model tidak bisa dibaca.", "rekomendasi peraturan: keluaran bukan JSON yang sah.");
  }

  // PENJAGAAN TERAKHIR, DAN YANG PALING PENTING DI BERKAS INI.
  // Butir tanpa URL http(s) yang sah dibuang tanpa ampun — apa pun alasannya.
  // Tanpa tautan, tidak ada cara bagi siapa pun untuk memeriksa nomornya, dan
  // nomor yang tidak bisa diperiksa tidak boleh muncul di layar aplikasi
  // kepatuhan.
  const peraturan = (hasil.peraturan || [])
    .filter((p) => p && typeof p.url === "string" && /^https?:\/\//i.test(p.url))
    .slice(0, 6)
    .map((p) => ({
      nomor: String(p.nomor || "").trim(),
      judul: String(p.judul || "").trim(),
      penerbit: String(p.penerbit || "").trim(),
      tahun: Number.isFinite(Number(p.tahun)) ? Number(p.tahun) : null,
      url: p.url,
      relevansi: String(p.relevansi || "").trim(),
    }))
    .filter((p) => p.nomor && p.judul);

  const dibuang = (hasil.peraturan || []).length - peraturan.length;
  return { peraturan, dibuang };
}

// --- 3. Usulan susunan dokumen ----------------------------------------------

/** Jenis dokumen yang bisa diusulkan susunannya, beserta watak masing-masing.
 *  Ditulis di sini dan bukan diserahkan ke model, karena beda antara SOP dan
 *  Instruksi Kerja adalah keputusan sistem mutu perusahaan — bukan selera. */
const JENIS = {
  SOP: {
    label: "Prosedur (SOP)",
    watak:
      "Prosedur lintas fungsi: menjawab SIAPA melakukan APA dan KAPAN. Memuat tujuan, ruang lingkup, definisi, " +
      "tanggung jawab, alur proses, rekaman, dan acuan. Tidak memuat langkah teknis yang sangat rinci.",
  },
  IK: {
    label: "Instruksi Kerja",
    watak:
      "Instruksi satu pekerjaan untuk satu pelaksana: menjawab BAGAIMANA persisnya. Berupa langkah berurutan " +
      "yang bisa diikuti tanpa penafsiran, lengkap dengan alat, parameter, dan titik pemeriksaan.",
  },
  FORM: {
    label: "Formulir",
    watak:
      "Formulir perekam bukti: daftar kolom isian beserta jenis isinya. Menjawab APA yang harus tercatat dan " +
      "SIAPA yang menandatangani. Bukan uraian prosedur.",
  },
  FLOW: {
    label: "Flowchart",
    watak:
      "Bagan alir: rangkaian langkah, percabangan keputusan, dan jalur untuk tiap hasil keputusan. Setiap simpul " +
      "punya pelaku yang jelas.",
  },
};

const SKEMA_SUSUNAN = {
  type: "object",
  properties: {
    judul: { type: "string", description: "Usulan judul dokumen." },
    nomorUsulan: { type: "string", description: "Contoh pola penomoran, mis. SOP/HSE/2026/001." },
    ringkasan: { type: "string", description: "Dua kalimat: dokumen ini untuk apa dan siapa pemakainya." },
    klausul: {
      type: "array",
      items: { type: "string" },
      description: "Klausul ISO 45001:2018 / ISO 9001:2015 yang ditopang dokumen ini, mis. 'ISO 45001:2018 8.1.2'.",
    },
    bagian: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nomor: { type: "string", description: "Nomor bagian, mis. '4' atau '4.2'." },
          judul: { type: "string" },
          isi: { type: "string", description: "Apa yang harus ditulis di bagian ini, 1-3 kalimat." },
        },
        required: ["nomor", "judul", "isi"],
        additionalProperties: false,
      },
    },
    langkah: {
      type: "array",
      description: "Untuk Instruksi Kerja dan Flowchart: langkah berurutan. Kosong untuk jenis lain.",
      items: {
        type: "object",
        properties: {
          urutan: { type: "integer" },
          pelaku: { type: "string", description: "Jabatan yang melakukannya." },
          tindakan: { type: "string" },
          keputusan: {
            type: "string",
            description: "Kosongkan bila bukan percabangan; isi dengan pertanyaan ya/tidak bila percabangan.",
          },
        },
        required: ["urutan", "pelaku", "tindakan", "keputusan"],
        additionalProperties: false,
      },
    },
    kolom: {
      type: "array",
      description: "Untuk Formulir: kolom isian. Kosong untuk jenis lain.",
      items: {
        type: "object",
        properties: {
          nama: { type: "string" },
          jenis: { type: "string", description: "mis. teks, tanggal, pilihan, tanda tangan, angka." },
          wajib: { type: "boolean" },
        },
        required: ["nama", "jenis", "wajib"],
        additionalProperties: false,
      },
    },
    rekaman: {
      type: "array",
      items: { type: "string" },
      description: "Rekaman yang dihasilkan dan harus disimpan.",
    },
  },
  required: ["judul", "nomorUsulan", "ringkasan", "klausul", "bagian", "langkah", "kolom", "rekaman"],
  additionalProperties: false,
};

/**
 * Usulkan susunan dokumen untuk sebuah topik.
 *
 * Keluarannya adalah KERANGKA, bukan dokumen jadi, dan itu disengaja: yang
 * boleh dikarang model adalah struktur — bagian apa saja yang harus ada agar
 * dokumen memenuhi klausul standar — sementara isi teknisnya harus datang
 * dari orang yang mengetahui prosesnya. Perbedaan itu dinyatakan juga di
 * layar, bukan hanya di sini.
 */
async function usulSusunan(frasa, jenisKode) {
  const jenis = JENIS[jenisKode];
  if (!jenis) {
    throw new AiError(400, "Jenis dokumen tidak dikenal.", `Pilih salah satu: ${Object.keys(JENIS).join(", ")}.`);
  }

  const response = await client().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    thinking: { type: "adaptive" },
    output_config: { format: { type: "json_schema", schema: SKEMA_SUSUNAN }, effort: "high" },
    system:
      "Anda penyusun dokumentasi sistem manajemen QHSE di perusahaan minyak dan gas Indonesia, terbiasa dengan " +
      "ISO 45001:2018, ISO 9001:2015, ISO 14001:2015, dan peraturan K3 Indonesia.\n\n" +
      `Jenis dokumen yang diminta: ${jenis.label}. ${jenis.watak}\n\n` +
      "Susun KERANGKA dokumen, bukan dokumen jadi: untuk tiap bagian, jelaskan apa yang harus ditulis di sana, " +
      "jangan menuliskan isinya seolah Anda mengetahui proses perusahaan ini. Jangan mengarang nomor peraturan " +
      "atau nomor dokumen internal — kolom nomorUsulan hanya contoh pola penomoran. " +
      "Sebutkan klausul standar hanya bila Anda yakin klausul itu memang mengatur hal tersebut. " +
      "Isi kolom langkah hanya untuk Instruksi Kerja dan Flowchart; isi kolom kolom hanya untuk Formulir; " +
      "kosongkan yang tidak berlaku. Jawab dalam bahasa Indonesia.",
    messages: [{ role: "user", content: `Topik dokumen: ${frasa}` }],
  });
  pastikanSelesai(response, "usulan susunan");
  const hasil = jsonDari(response, "usulan susunan");
  return { jenis: jenisKode, label: jenis.label, ...hasil };
}

module.exports = { aktif, perluasKataKunci, rekomendasiPeraturan, usulSusunan, AiError, JENIS, MODEL };
