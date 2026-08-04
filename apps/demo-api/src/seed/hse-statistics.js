// Statistik HSE bulanan — jam kerja, tenaga kerja, dan leading indicator.
//
// ANGKANYA DIRANCANG, BUKAN DIACAK BEBAS, dan alasannya sama dengan alasan
// tabelnya ada: dashboard eksekutif dibaca untuk mengambil kesimpulan, dan
// angka acak menghasilkan kesimpulan acak. Jam kerja yang meloncat dari
// 90.000 ke 400.000 lalu turun lagi bukan sekadar tidak rapi — ia membuat
// LTIFR berayun liar tanpa sebab, dan pembacanya akan mencari penjelasan
// untuk pola yang tidak pernah ada.
//
// Yang dibentuk di sini adalah SATU CERITA yang konsisten selama 12 bulan:
//
//   - Tenaga kerja naik perlahan (proyek bertambah), jam kerja mengikutinya.
//   - Kegiatan pencegahan naik lebih cepat daripada tenaga kerja — program
//     keselamatan yang sedang digalakkan.
//   - Observasi tidak aman naik lebih dulu, lalu mendatar. Itu pola yang
//     benar dan sering disalahpahami: naiknya laporan tidak-aman pada awal
//     program berarti orang MULAI melaporkan, bukan tempat kerja makin
//     berbahaya.
//
// Jam kerja SENGAJA cocok dengan insiden yang disemai domain-events.js:
// dengan ~1,9 juta jam kerja setahun dan satu kecelakaan hilang hari kerja,
// LTIFR jatuh di kisaran 0,5 — angka yang wajar untuk operasi migas dan bisa
// dibandingkan orang dengan pengalamannya sendiri. LTIFR 40 atau 0,001 akan
// langsung memberi tahu penonton bahwa datanya karangan.
const { uuidFor, upsert, seededRandom, intBetween } = require("./lib");

async function seedHseStatistics(client, ctx) {
  const random = seededRandom("hse-period-statistics");

  // 24 bulan ke belakang: satu tahun untuk ditampilkan, satu tahun lagi
  // supaya perbandingan tahun-ke-tahun punya lawan bicara.
  const BULAN = 24;
  const sekarang = new Date();
  let created = 0;

  for (let mundur = BULAN - 1; mundur >= 0; mundur--) {
    const awal = new Date(Date.UTC(sekarang.getUTCFullYear(), sekarang.getUTCMonth() - mundur, 1));
    const periode = awal.toISOString().slice(0, 10);
    // 0 di bulan terlama, 1 di bulan terbaru — dipakai sebagai kemiringan
    // pertumbuhan supaya seluruh besaran tumbuh searah.
    const maju = (BULAN - 1 - mundur) / (BULAN - 1);

    const manpower = Math.round(360 + maju * 140 + intBetween(random, -12, 12));
    // ~173 jam per orang per bulan (40 jam/minggu). Dihitung dari tenaga
    // kerja, bukan diundi sendiri: jam kerja yang tidak sebanding dengan
    // jumlah orang adalah hal pertama yang dilihat auditor.
    const manhours = Math.round(manpower * 173 + intBetween(random, -2500, 2500));

    // Observasi naik tajam di paruh pertama lalu mendatar — kurva program
    // keselamatan yang baru berjalan.
    const kematangan = Math.min(1, maju * 1.8);
    const observasi = Math.round(120 + kematangan * 260 + intBetween(random, -18, 18));

    await upsert(
      client,
      "hse_period_statistics",
      "hse_period_statistic_id",
      {
        hse_period_statistic_id: uuidFor("hse-period-statistic", periode),
        // site_id NULL = angka seluruh perusahaan. Statistik per lokasi
        // dibiarkan kosong: memecahnya per lokasi tanpa sumber data yang
        // sungguh memisahkannya hanya membagi angka karangan jadi dua.
        site_id: null,
        period_month: periode,
        manpower,
        manhours,
        safety_inductions: Math.round(manpower * 0.18 + intBetween(random, -6, 6)),
        toolbox_talks: Math.round(56 + maju * 40 + intBetween(random, -5, 5)),
        hse_meetings: intBetween(random, 3, 6),
        training_hours: Math.round(180 + maju * 220 + intBetween(random, -25, 25)),
        management_walkthroughs: intBetween(random, 4, 9),
        safety_observations: observasi,
        // Tindakan tidak aman selalu lebih banyak daripada kondisi tidak
        // aman, dan itu bukan selera: perilaku lebih sering teramati
        // daripada keadaan fisik, dan seluruh literatur observasi
        // keselamatan menunjukkan perbandingan itu.
        unsafe_acts: Math.round(observasi * 0.42 + intBetween(random, -8, 8)),
        unsafe_conditions: Math.round(observasi * 0.24 + intBetween(random, -6, 6)),
        notes: null,
        created_by: ctx.users[0]?.id ?? null,
        updated_by: ctx.users[0]?.id ?? null,
      },
      { tenant_id: ctx.tenantId },
    );
    created += 1;
  }

  return { hsePeriodStatistics: created };
}

module.exports = { seedHseStatistics };
