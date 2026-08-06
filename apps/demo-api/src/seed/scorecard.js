// Sasaran mutu (ISO 9001 klausul 6.2) yang sekaligus menjadi KPI Balanced
// Scorecard, beserta riwayat capaian bulanannya.
//
// TARGET, BASELINE, DAN CAPAIAN DITULIS EKSPLISIT, tidak diacak.
//
// Seluruh penyemai lain di direktori ini memakai PRNG berbenih untuk membuat
// variasi, dan itu tepat untuk 54 izin kerja yang isinya memang seragam. Di
// sini tidak: scorecard dibaca sebagai PENILAIAN, dan angka acak menghasilkan
// penilaian yang tidak masuk akal — perusahaan yang biaya kerugiannya turun
// tajam sambil angka insidennya naik, atau perspektif keuangan hijau sempurna
// sementara proses internalnya merah. Yang dibaca orang saat presentasi bukan
// angkanya satu per satu, melainkan CERITA yang dibentuk keempat perspektif
// bersama-sama, dan cerita itu harus konsisten.
//
// Cerita yang disusun di bawah: perusahaan yang kinerja keselamatannya
// membaik nyata (biaya kerugian turun, nyaris celaka makin banyak dilaporkan
// — pertanda budaya lapor menguat, bukan pertanda memburuk), tapi masih
// tertinggal pada dua hal yang memang paling sering tertinggal di lapangan:
// menutup CAPA tepat waktu dan menghabiskan temuan audit yang berulang.
const { uuidFor, seededRandom, upsert, dateOnly, NOW } = require("./lib");

const YEAR = NOW.getUTCFullYear();
const PERIOD_START = `${YEAR}-01-01`;
const PERIOD_END = `${YEAR}-12-31`;

// direction tidak disimpan sebagai kolom: ia DISIMPULKAN dari target terhadap
// baseline saat dibaca (lihat scorecard.js). Yang ditulis di sini hanya
// dipakai untuk memilih nilai capaian yang masuk akal, dan sengaja dicantumkan
// supaya baris di bawah bisa dibaca tanpa menghitung sendiri arah "baik"-nya.
const OBJECTIVES = [
  // --- Keuangan -------------------------------------------------------------
  {
    code: "OBJ-FIN-01",
    perspective: "FINANCIAL",
    weight: 30,
    title: "Menekan biaya kerugian akibat insiden",
    metric: "Total estimasi biaya kerugian insiden",
    unit: "IDR",
    baseline: 1_200_000_000,
    target: 500_000_000,
    current: 852_000_000,
    owner: "andi",
    frequency: "QUARTERLY",
    description:
      "Biaya kerugian mencakup kerusakan properti, penghentian operasi, dan penanganan tumpahan. Diambil dari estimasi biaya yang tercatat pada laporan insiden.",
  },
  {
    code: "OBJ-FIN-02",
    perspective: "FINANCIAL",
    weight: 25,
    title: "Nihil denda dan sanksi regulator lingkungan",
    metric: "Nilai denda dan sanksi yang dibayarkan",
    unit: "IDR",
    baseline: 150_000_000,
    target: 0,
    current: 0,
    owner: "wahyu",
    frequency: "SEMI_ANNUAL",
    description: "Sanksi administratif maupun denda dari KLHK dan dinas lingkungan hidup daerah.",
  },
  {
    code: "OBJ-FIN-03",
    perspective: "FINANCIAL",
    weight: 25,
    title: "Menekan pemeliharaan tak terencana pada aset kritis",
    metric: "Biaya pemeliharaan tak terencana",
    unit: "IDR",
    baseline: 1_100_000_000,
    target: 800_000_000,
    current: 935_000_000,
    owner: "yusuf",
    frequency: "QUARTERLY",
    description:
      "Pemeliharaan tak terencana adalah petunjuk paling langsung bahwa inspeksi dan kalibrasi belum menangkap kerusakan sebelum terjadi.",
  },
  {
    code: "OBJ-FIN-04",
    perspective: "FINANCIAL",
    weight: 20,
    title: "Menurunkan premi asuransi lewat kinerja K3",
    metric: "Rasio premi asuransi terhadap total upah",
    unit: "%",
    baseline: 1.8,
    target: 1.2,
    current: 1.35,
    owner: "siti",
    frequency: "ANNUAL",
    description: "Rasio premi ditinjau penanggung setiap tahun berdasarkan riwayat klaim dan angka kecelakaan.",
  },

  // --- Pelanggan & Pemangku Kepentingan -------------------------------------
  {
    code: "OBJ-CUS-01",
    perspective: "CUSTOMER",
    weight: 30,
    title: "Menjaga kepuasan pelanggan atas mutu produk",
    metric: "Indeks kepuasan pelanggan",
    unit: "poin",
    baseline: 82,
    target: 90,
    current: 88,
    owner: "lina",
    frequency: "SEMI_ANNUAL",
    description: "Survei kepuasan pelanggan dua kali setahun, mencakup mutu produk, ketepatan pengiriman, dan penanganan keluhan.",
  },
  {
    code: "OBJ-CUS-02",
    perspective: "CUSTOMER",
    weight: 25,
    title: "Menurunkan jumlah keluhan pelanggan",
    metric: "Keluhan pelanggan diterima",
    unit: "keluhan",
    baseline: 14,
    target: 6,
    current: 7,
    owner: "lina",
    frequency: "QUARTERLY",
    description: "Keluhan yang teregistrasi resmi, termasuk yang kemudian terbukti bukan kesalahan mutu.",
  },
  {
    code: "OBJ-CUS-03",
    perspective: "CUSTOMER",
    weight: 25,
    title: "Menyelesaikan keluhan pelanggan tepat waktu",
    metric: "Keluhan ditutup dalam 14 hari",
    unit: "%",
    baseline: 78,
    target: 95,
    current: 91,
    owner: "lina",
    frequency: "MONTHLY",
    description: "Dihitung dari tanggal keluhan diterima sampai tanggal jawaban resmi dikirim ke pelanggan.",
  },
  {
    code: "OBJ-CUS-04",
    perspective: "CUSTOMER",
    weight: 20,
    title: "Mempertahankan sertifikasi ISO tanpa temuan mayor",
    metric: "Ketidaksesuaian mayor pada audit eksternal",
    unit: "temuan",
    baseline: 2,
    target: 0,
    current: 0,
    owner: "maria",
    frequency: "ANNUAL",
    description: "Audit surveillance lembaga sertifikasi untuk ISO 9001, ISO 14001, dan ISO 45001.",
  },

  // --- Proses Internal ------------------------------------------------------
  {
    code: "OBJ-INT-01",
    perspective: "INTERNAL_PROCESS",
    weight: 25,
    title: "Nihil insiden dengan hilang hari kerja",
    metric: "Insiden hilang hari kerja (LTI)",
    unit: "insiden",
    baseline: 3,
    target: 0,
    current: 1,
    owner: "andi",
    frequency: "MONTHLY",
    description:
      "Satu LTI masih terjadi tahun ini. Target nol tidak diturunkan menjadi angka yang lebih mudah dicapai — sasaran keselamatan yang direvisi agar terlihat tercapai berhenti menjadi sasaran.",
  },
  {
    code: "OBJ-INT-02",
    perspective: "INTERNAL_PROCESS",
    weight: 25,
    title: "Menutup CAPA sesuai tenggat",
    metric: "CAPA ditutup tepat waktu",
    unit: "%",
    baseline: 61,
    target: 90,
    current: 68,
    owner: "dewi",
    frequency: "MONTHLY",
    description:
      "Tertinggal paling jauh di antara seluruh sasaran proses internal, dan sejalan dengan 13 CAPA yang saat ini lewat tenggat di Register CAPA.",
  },
  {
    code: "OBJ-INT-03",
    perspective: "INTERNAL_PROCESS",
    weight: 20,
    title: "Melaksanakan inspeksi sesuai jadwal",
    metric: "Inspeksi terlaksana sesuai jadwal",
    unit: "%",
    baseline: 84,
    target: 95,
    current: 93,
    owner: "rudi",
    frequency: "MONTHLY",
    description: "Inspeksi yang dikerjakan pada bulan rencananya, tanpa penundaan ke bulan berikutnya.",
  },
  {
    code: "OBJ-INT-04",
    perspective: "INTERNAL_PROCESS",
    weight: 15,
    title: "Seluruh pekerjaan berisiko tinggi berizin sah",
    metric: "Pekerjaan berisiko tinggi dengan izin kerja sah",
    unit: "%",
    baseline: 93,
    target: 100,
    current: 99,
    owner: "hendra",
    frequency: "MONTHLY",
    description: "Diperiksa lewat audit lapangan mendadak terhadap pekerjaan panas, ruang terbatas, dan bekerja di ketinggian.",
  },
  {
    code: "OBJ-INT-05",
    perspective: "INTERNAL_PROCESS",
    weight: 15,
    title: "Menghabiskan temuan audit yang berulang",
    metric: "Temuan audit internal yang berulang",
    unit: "temuan",
    baseline: 9,
    target: 2,
    current: 5,
    owner: "maria",
    frequency: "SEMI_ANNUAL",
    description:
      "Temuan berulang adalah petunjuk bahwa CAPA sebelumnya menutup gejalanya, bukan akar masalahnya — karena itu diukur terpisah dari jumlah temuan.",
  },

  // --- Pembelajaran & Pertumbuhan -------------------------------------------
  {
    code: "OBJ-LNG-01",
    perspective: "LEARNING_GROWTH",
    weight: 30,
    title: "Seluruh pekerja lapangan bersertifikat K3",
    metric: "Pekerja lapangan dengan sertifikat K3 berlaku",
    unit: "%",
    baseline: 76,
    target: 100,
    current: 94,
    owner: "andi",
    frequency: "QUARTERLY",
    description: "Sertifikat yang masih berlaku, bukan yang pernah dimiliki — sertifikat kedaluwarsa dihitung sebagai belum bersertifikat.",
  },
  {
    code: "OBJ-LNG-02",
    perspective: "LEARNING_GROWTH",
    weight: 25,
    title: "Menaikkan jam pelatihan QHSE per pekerja",
    metric: "Jam pelatihan QHSE per pekerja per tahun",
    unit: "jam",
    baseline: 12,
    target: 24,
    current: 21,
    owner: "siti",
    frequency: "QUARTERLY",
    description: "Mencakup pelatihan wajib, penyegaran tahunan, dan pelatihan khusus pekerjaan berisiko tinggi.",
  },
  {
    code: "OBJ-LNG-03",
    perspective: "LEARNING_GROWTH",
    weight: 25,
    title: "Menguatkan budaya lapor nyaris celaka",
    metric: "Laporan nyaris celaka diterima",
    unit: "laporan",
    baseline: 22,
    target: 60,
    current: 58,
    owner: "dewi",
    frequency: "MONTHLY",
    description:
      "Satu-satunya sasaran di scorecard ini yang angkanya SENGAJA dikejar naik. Nyaris celaka yang makin banyak dilaporkan menandakan pekerja makin berani melapor, bukan tempat kerja yang makin berbahaya — dan menurunkannya justru pertanda buruk.",
  },
  {
    code: "OBJ-LNG-04",
    perspective: "LEARNING_GROWTH",
    weight: 20,
    title: "Menjaga kesiapan tanggap darurat",
    metric: "Latihan tanggap darurat terlaksana sesuai rencana",
    unit: "%",
    baseline: 67,
    target: 100,
    current: 83,
    owner: "rudi",
    frequency: "SEMI_ANNUAL",
    description: "Latihan kebakaran, tumpahan bahan kimia, evakuasi, dan simulasi kecelakaan kerja di ketiga lokasi.",
  },
];

/** Sama persis dengan aturan di src/scorecard.js — status yang tersimpan tidak
 * boleh bertentangan dengan capaian yang dihitung ulang saat dibaca. */
function statusFor(percent) {
  if (percent >= 100) return "ACHIEVED";
  if (percent >= 90) return "ON_TRACK";
  if (percent >= 75) return "AT_RISK";
  return "OFF_TRACK";
}

function attainment(current, target, baseline) {
  const lowerIsBetter = baseline !== null && Number(target) < Number(baseline);
  if (lowerIsBetter) {
    if (target === 0) return current === 0 ? 100 : 0;
    if (current === 0) return 100;
    return (target / current) * 100;
  }
  if (target === 0) return 100;
  return (current / target) * 100;
}

/**
 * Riwayat 12 bulan yang BERGERAK DARI baseline MENUJU capaian sekarang.
 *
 * Bukan garis lurus: sedikit riak ditambahkan dengan PRNG berbenih supaya
 * grafiknya terbaca sebagai pengukuran, bukan sebagai rumus. Riaknya kecil
 * (maksimum 6% dari rentang) dan benihnya tetap, jadi bentuk grafik yang
 * dilihat hari ini sama dengan yang dilihat saat presentasi.
 *
 * Titik TERAKHIR dipaksa sama dengan current_value. Kalau tidak, angka besar
 * di kartu dan ujung garis tren di sebelahnya akan berbeda tipis, dan itu
 * satu-satunya hal yang pasti ditanyakan orang.
 */
function monthlyTrend(objective) {
  const random = seededRandom(`scorecard:${objective.code}`);
  const from = Number(objective.baseline);
  const to = Number(objective.current);
  const span = to - from;
  const points = [];

  for (let index = 0; index < 12; index++) {
    const month = new Date(Date.UTC(YEAR, index, 1));
    const progress = index / 11;
    const riak = index === 11 ? 0 : (random() - 0.5) * Math.abs(span) * 0.12;
    const raw = index === 11 ? to : from + span * progress + riak;
    // Tidak ada KPI di scorecard ini yang bermakna negatif (biaya, persentase,
    // jumlah kejadian, jam pelatihan), jadi riak tidak boleh menyeretnya ke
    // bawah nol.
    const value = Math.max(0, raw);
    points.push({
      label: `${YEAR}-${String(index + 1).padStart(2, "0")}`,
      value: objective.unit === "IDR" ? Math.round(value / 1_000_000) * 1_000_000 : Math.round(value * 100) / 100,
      recordedAt: new Date(Date.UTC(YEAR, index + 1, 0, 12, 0, 0)),
    });
  }
  return points;
}

async function seedScorecard(client, ctx) {
  let objectiveCount = 0;
  let progressCount = 0;

  for (const objective of OBJECTIVES) {
    const objectiveId = uuidFor("quality_objective", objective.code);
    const percent = attainment(objective.current, objective.target, objective.baseline);

    await upsert(
      client,
      "quality_objectives",
      "quality_objective_id",
      {
        quality_objective_id: objectiveId,
        company_id: ctx.companyId,
        objective_code: objective.code,
        objective_title: objective.title,
        description: objective.description,
        iso_clause_ref: "6.2",
        kpi_metric_name: objective.metric,
        target_value: objective.target,
        target_unit: objective.unit,
        baseline_value: objective.baseline,
        current_value: objective.current,
        at_risk_threshold_percentage: 10,
        measurement_frequency: objective.frequency,
        owner_user_id: ctx.userIds[objective.owner] || ctx.userIds.andi,
        period_start: PERIOD_START,
        period_end: PERIOD_END,
        status: statusFor(percent),
        last_reviewed_date: dateOnly(NOW),
        bsc_perspective: objective.perspective,
        bsc_weight_percentage: objective.weight,
      },
      ctx.audit,
    );
    objectiveCount++;

    for (const point of monthlyTrend(objective)) {
      await upsert(
        client,
        "quality_objective_progress_logs",
        "progress_log_id",
        {
          progress_log_id: uuidFor("quality_objective_progress", `${objective.code}:${point.label}`),
          quality_objective_id: objectiveId,
          period_label: point.label,
          actual_value: point.value,
          recorded_by: ctx.userIds[objective.owner] || ctx.userIds.andi,
          recorded_at: point.recordedAt,
        },
        ctx.audit,
      );
      progressCount++;
    }
  }

  return { qualityObjectives: objectiveCount, objectiveProgressLogs: progressCount };
}

module.exports = { seedScorecard, OBJECTIVES };
