// Program pelatihan dan realisasinya.
//
// DAFTAR PELATIHANNYA BUKAN KARANGAN BEBAS. Setiap baris yang ditandai wajib
// menyebut peraturan Indonesia yang mewajibkannya, dan peraturan itu benar
// ada. Alasannya bukan kelengkapan dokumentasi: yang membaca layar ini adalah
// orang yang setiap tahun menyusun program pelatihan K3 dan hafal daftarnya.
// "Pelatihan Keselamatan Tingkat Lanjut" yang tidak merujuk apa pun akan
// langsung terbaca sebagai data isian, dan begitu satu layar terbaca begitu,
// seluruh aplikasi ikut kehilangan kepercayaan.
//
// TIGA KEADAAN YANG SENGAJA ADA DI DATA INI, karena ketiganya yang membuat
// modul rencana-vs-realisasi punya arti:
//
//   1. Program yang terlaksana BERKALI-KALI — induksi K3 pekerja baru
//      berjalan tiap bulan dengan peserta berbeda.
//   2. Realisasi TANPA program — pelatihan dadakan setelah insiden, yang
//      training_program_id-nya NULL.
//   3. Program yang BELUM/TIDAK terlaksana — satu ditunda, satu dibatalkan,
//      satu masih rencana. Tanpa ketiganya, tingkat pencapaian program selalu
//      100% dan angkanya berhenti berarti.
//
// JAM PELATIHANNYA SENGAJA SEBANDING dengan training_hours di
// hse_period_statistics (~180–400 jam per bulan). Dua sumber angka yang
// bertolak belakang di layar yang sama — "jam pelatihan 4.221" pada dashboard
// eksekutif berdampingan dengan realisasi pelatihan yang totalnya 300 —
// adalah cara tercepat membuat pembaca berhenti mempercayai keduanya.
const { uuidFor, upsert, seededRandom, intBetween, pick, daysAgo, daysFromNow, dateOnly } = require("./lib");

const TAHUN = new Date().getUTCFullYear();
const BULAN_INI = new Date().getUTCMonth() + 1;
const HARI_INI = new Date().getUTCDate();

// key         : dipakai membentuk UUID yang stabil antar penyemaian
// wajib+dasar : peraturan yang mewajibkannya
// bulanMulai  : bulan ke-n tahun berjalan (1..12) rencana dimulai
// sesi        : berapa kali direncanakan berjalan setahun
const PROGRAM = [
  {
    key: "induksi",
    judul: "Induksi K3 Pekerja Baru, Mutasi, dan Tamu",
    jenis: "INDUCTION",
    wajib: true,
    dasar: "PP No. 50 Tahun 2012 Lampiran II kriteria 12.1",
    sasaran: "Seluruh pekerja baru, pekerja mutasi, dan tamu proyek",
    peserta: 240,
    jamPerPeserta: 2,
    sesi: 12,
    metode: "IN_HOUSE",
    penyelenggara: "Departemen HSE & Quality",
    anggaran: 36000000,
    bulanMulai: 1,
    bulanSelesai: 12,
    sertifikat: false,
    pic: "dewi",
    status: "IN_PROGRESS",
  },
  {
    key: "ak3u",
    judul: "Sertifikasi Ahli K3 Umum (AK3U)",
    jenis: "MANDATORY_CERTIFICATION",
    wajib: true,
    dasar: "Permenaker No. Per.02/MEN/1992 tentang Tata Cara Penunjukan Ahli K3",
    sasaran: "Calon Ahli K3 Umum dari HSE dan Operasi",
    peserta: 4,
    jamPerPeserta: 96,
    sesi: 1,
    metode: "PUBLIC_CLASS",
    penyelenggara: "PJK3 Sucofindo",
    anggaran: 60000000,
    bulanMulai: 3,
    bulanSelesai: 3,
    sertifikat: true,
    masaBerlakuBulan: 36,
    pic: "andi",
    status: "COMPLETED",
  },
  {
    key: "confined",
    judul: "Petugas K3 Ruang Terbatas (Confined Space) Madya",
    jenis: "MANDATORY_CERTIFICATION",
    wajib: true,
    dasar: "Kepdirjen Binwasnaker No. Kep.113/DJPPK/IX/2006",
    sasaran: "Operator produksi dan teknisi yang masuk bejana/tangki",
    peserta: 12,
    jamPerPeserta: 24,
    sesi: 2,
    metode: "PUBLIC_CLASS",
    penyelenggara: "PJK3 Prima Sertifikasi",
    anggaran: 54000000,
    bulanMulai: 2,
    bulanSelesai: 8,
    sertifikat: true,
    masaBerlakuBulan: 36,
    pic: "dewi",
    status: "COMPLETED",
  },
  {
    key: "p3k",
    judul: "Petugas P3K di Tempat Kerja",
    jenis: "MANDATORY_CERTIFICATION",
    wajib: true,
    dasar: "Permenakertrans No. Per.15/MEN/VIII/2008",
    sasaran: "Perwakilan tiap regu kerja di seluruh lokasi",
    peserta: 16,
    jamPerPeserta: 16,
    sesi: 2,
    metode: "IN_HOUSE",
    penyelenggara: "PJK3 Medika Karya",
    anggaran: 32000000,
    bulanMulai: 4,
    bulanSelesai: 9,
    sertifikat: true,
    masaBerlakuBulan: 36,
    pic: "ratna",
    status: "COMPLETED",
  },
  {
    key: "damkar",
    judul: "Petugas Pemadam Kebakaran Kelas D",
    jenis: "MANDATORY_CERTIFICATION",
    wajib: true,
    dasar: "Kepmenaker No. Kep.186/MEN/1999 tentang Unit Penanggulangan Kebakaran",
    sasaran: "Anggota regu tanggap darurat lokasi Cepu dan Balikpapan",
    peserta: 20,
    jamPerPeserta: 16,
    sesi: 2,
    metode: "IN_HOUSE",
    penyelenggara: "Dinas Pemadam Kebakaran & PJK3 Sinar Aman",
    anggaran: 40000000,
    bulanMulai: 5,
    bulanSelesai: 10,
    sertifikat: true,
    masaBerlakuBulan: 36,
    pic: "rudi",
    status: "IN_PROGRESS",
  },
  {
    key: "ketinggian",
    judul: "Tenaga Kerja Bangunan Tinggi Tingkat 1 (Bekerja di Ketinggian)",
    jenis: "MANDATORY_CERTIFICATION",
    wajib: true,
    dasar: "Permenaker No. 9 Tahun 2016 tentang K3 dalam Pekerjaan pada Ketinggian",
    sasaran: "Teknisi mekanik, instrumentasi, dan scaffolder",
    peserta: 14,
    jamPerPeserta: 24,
    sesi: 1,
    metode: "PUBLIC_CLASS",
    penyelenggara: "PJK3 Prima Sertifikasi",
    anggaran: 49000000,
    bulanMulai: 6,
    bulanSelesai: 6,
    sertifikat: true,
    masaBerlakuBulan: 36,
    pic: "rudi",
    status: "COMPLETED",
  },
  {
    key: "angkat",
    judul: "Operator Pesawat Angkat dan Angkut Kelas II (Mobile Crane)",
    jenis: "MANDATORY_CERTIFICATION",
    wajib: true,
    dasar: "Permenaker No. 8 Tahun 2020 tentang K3 Pesawat Angkat dan Pesawat Angkut",
    sasaran: "Operator crane dan forklift",
    peserta: 6,
    jamPerPeserta: 40,
    sesi: 1,
    metode: "PUBLIC_CLASS",
    penyelenggara: "PJK3 Karya Sertifikasi Nusantara",
    anggaran: 42000000,
    bulanMulai: 7,
    bulanSelesai: 7,
    sertifikat: true,
    masaBerlakuBulan: 60,
    pic: "yusuf",
    status: "COMPLETED",
  },
  {
    key: "loto",
    judul: "Lock Out Tag Out (LOTO) dan Isolasi Energi Berbahaya",
    jenis: "TECHNICAL_COMPETENCY",
    wajib: false,
    dasar: null,
    sasaran: "Teknisi maintenance, operator produksi, pengawas",
    peserta: 45,
    jamPerPeserta: 8,
    sesi: 3,
    metode: "IN_HOUSE",
    penyelenggara: "Departemen HSE & Quality",
    anggaran: 18000000,
    bulanMulai: 2,
    bulanSelesai: 11,
    sertifikat: false,
    pic: "andi",
    status: "IN_PROGRESS",
  },
  {
    key: "ptw",
    judul: "Sistem Izin Kerja (PTW) untuk Pengawas dan Penerbit Izin",
    jenis: "TECHNICAL_COMPETENCY",
    wajib: false,
    dasar: null,
    sasaran: "Supervisor, area authority, dan HSE officer",
    peserta: 24,
    jamPerPeserta: 8,
    sesi: 2,
    metode: "IN_HOUSE",
    penyelenggara: "Departemen HSE & Quality",
    anggaran: 12000000,
    bulanMulai: 3,
    bulanSelesai: 9,
    sertifikat: false,
    pic: "dewi",
    status: "COMPLETED",
  },
  {
    key: "lb3",
    judul: "Pengelolaan Limbah Bahan Berbahaya dan Beracun (LB3)",
    jenis: "MANDATORY_CERTIFICATION",
    wajib: true,
    dasar: "PP No. 22 Tahun 2021 jo. Permen LHK No. 6 Tahun 2021",
    sasaran: "Petugas TPS LB3 dan environmental officer",
    peserta: 6,
    jamPerPeserta: 32,
    sesi: 1,
    metode: "PUBLIC_CLASS",
    penyelenggara: "Lembaga Sertifikasi Profesi Lingkungan Hidup",
    anggaran: 30000000,
    bulanMulai: 5,
    bulanSelesai: 5,
    sertifikat: true,
    masaBerlakuBulan: 36,
    pic: "wahyu",
    status: "COMPLETED",
  },
  {
    key: "auditor",
    judul: "Internal Auditor ISO 9001:2015 dan ISO 45001:2018",
    jenis: "TECHNICAL_COMPETENCY",
    wajib: false,
    dasar: null,
    sasaran: "Calon auditor internal dari seluruh departemen",
    peserta: 10,
    jamPerPeserta: 24,
    sesi: 1,
    metode: "BLENDED",
    penyelenggara: "Badan Sertifikasi TUV Rheinland Indonesia",
    anggaran: 45000000,
    bulanMulai: 4,
    bulanSelesai: 4,
    sertifikat: true,
    masaBerlakuBulan: 36,
    pic: "maria",
    status: "COMPLETED",
  },
  {
    key: "awareness45001",
    judul: "Awareness ISO 45001:2018 dan Kebijakan K3 Perusahaan",
    jenis: "AWARENESS",
    wajib: false,
    dasar: null,
    sasaran: "Seluruh karyawan",
    peserta: 180,
    jamPerPeserta: 3,
    sesi: 4,
    metode: "ONLINE",
    penyelenggara: "Departemen HSE & Quality",
    anggaran: 9000000,
    bulanMulai: 1,
    bulanSelesai: 10,
    sertifikat: false,
    pic: "lina",
    status: "IN_PROGRESS",
  },
  {
    key: "damkarSimulasi",
    judul: "Simulasi Tanggap Darurat Kebakaran dan Evakuasi",
    jenis: "EMERGENCY_DRILL",
    wajib: true,
    dasar: "PP No. 50 Tahun 2012 Lampiran II kriteria 6.7",
    sasaran: "Seluruh penghuni area operasi",
    peserta: 200,
    jamPerPeserta: 3,
    sesi: 2,
    metode: "ON_THE_JOB",
    penyelenggara: "Tim Tanggap Darurat Perusahaan",
    anggaran: 24000000,
    bulanMulai: 4,
    bulanSelesai: 10,
    sertifikat: false,
    pic: "andi",
    status: "IN_PROGRESS",
  },
  {
    key: "tumpahan",
    judul: "Simulasi Penanggulangan Tumpahan Minyak (Oil Spill Response)",
    jenis: "EMERGENCY_DRILL",
    wajib: true,
    dasar: "Permen ESDM No. 18 Tahun 2018 tentang Pemeriksaan Keselamatan Migas",
    sasaran: "Regu tanggap darurat terminal Balikpapan",
    peserta: 30,
    jamPerPeserta: 6,
    sesi: 1,
    metode: "ON_THE_JOB",
    penyelenggara: "Tim Tanggap Darurat Perusahaan & OSCT Indonesia",
    anggaran: 35000000,
    bulanMulai: 8,
    bulanSelesai: 8,
    sertifikat: false,
    pic: "rudi",
    // BELUM terlaksana dan memang belum waktunya — statusnya APPROVED, bukan
    // DEFERRED. Bedanya penting: yang ini masih akan berjalan tahun ini.
    status: "APPROVED",
  },
  {
    key: "investigasi",
    judul: "Investigasi Insiden dan Analisis Akar Masalah (RCA)",
    jenis: "TECHNICAL_COMPETENCY",
    wajib: false,
    dasar: null,
    sasaran: "HSE officer, supervisor, dan kepala departemen",
    peserta: 18,
    jamPerPeserta: 16,
    sesi: 1,
    metode: "IN_HOUSE",
    penyelenggara: "Konsultan K3 Nusa Persada",
    anggaran: 28000000,
    bulanMulai: 6,
    bulanSelesai: 6,
    sertifikat: false,
    pic: "andi",
    status: "COMPLETED",
  },
  {
    key: "defensive",
    judul: "Penyegaran Defensive Driving untuk Pengemudi Operasional",
    jenis: "REFRESHER",
    wajib: false,
    dasar: null,
    sasaran: "Pengemudi kendaraan operasional dan light vehicle",
    peserta: 22,
    jamPerPeserta: 8,
    sesi: 1,
    metode: "IN_HOUSE",
    penyelenggara: "Rifat Drive Labs",
    anggaran: 22000000,
    bulanMulai: 9,
    bulanSelesai: 9,
    sertifikat: false,
    pic: "hendra",
    // DITUNDA, bukan dibatalkan: anggarannya digeser ke tahun berikutnya, dan
    // rencananya tetap ikut dihitung sebagai yang belum terpenuhi.
    status: "DEFERRED",
  },
  {
    key: "higiene",
    judul: "Awareness Higiene Industri dan Pengukuran Lingkungan Kerja",
    jenis: "AWARENESS",
    wajib: false,
    dasar: null,
    sasaran: "HSE officer dan perwakilan departemen",
    peserta: 15,
    jamPerPeserta: 6,
    sesi: 1,
    metode: "ONLINE",
    penyelenggara: "Perhimpunan Ahli Higiene Industri Indonesia",
    anggaran: 7500000,
    bulanMulai: 11,
    bulanSelesai: 11,
    sertifikat: false,
    pic: "ratna",
    status: "DRAFT",
  },
  {
    key: "seminar",
    judul: "Seminar Nasional Bulan K3 Nasional",
    jenis: "EXTERNAL_SEMINAR",
    wajib: false,
    dasar: null,
    sasaran: "Manajemen dan HSE",
    peserta: 5,
    jamPerPeserta: 8,
    sesi: 1,
    metode: "PUBLIC_CLASS",
    penyelenggara: "Kementerian Ketenagakerjaan RI",
    anggaran: 10000000,
    bulanMulai: 1,
    bulanSelesai: 1,
    sertifikat: false,
    pic: "andi",
    // DIBATALKAN — penyelenggaraannya diubah jadi daring gratis oleh
    // panitianya, jadi anggarannya tidak terpakai.
    status: "CANCELLED",
  },
];

// Berapa sesi dari rencana yang BENAR-BENAR berjalan. Sengaja tidak selalu
// sama dengan `sesi`: program yang seluruh rencananya selalu terlaksana
// membuat tingkat pencapaian tidak pernah bergerak, dan angka yang tidak
// pernah bergerak tidak dipakai siapa pun untuk memutuskan apa-apa.
const REALISASI = {
  induksi: 9,
  ak3u: 1,
  confined: 2,
  p3k: 2,
  damkar: 1,
  ketinggian: 1,
  angkat: 1,
  loto: 2,
  ptw: 2,
  lb3: 1,
  auditor: 1,
  awareness45001: 3,
  damkarSimulasi: 1,
  investigasi: 1,
  // tumpahan, defensive, higiene, seminar: nol — masing-masing karena
  // belum waktunya, ditunda, masih rencana, dan dibatalkan.
};

// Peserta kontraktor — TIDAK punya akun di aplikasi ini, dan itulah alasan
// training_participants.user_id boleh NULL. Pekerja kontraktor justru yang
// paling sering ditanyakan sertifikatnya saat audit CSMS.
const PESERTA_KONTRAKTOR = [
  { nama: "Sutrisno", perusahaan: "CV Mitra Jasa Teknik", jabatan: "Welder" },
  { nama: "Marwan Hadi", perusahaan: "CV Mitra Jasa Teknik", jabatan: "Helper Mekanik" },
  { nama: "Slamet Riyadi", perusahaan: "PT Sarana Konstruksi Andalan", jabatan: "Scaffolder" },
  { nama: "Herman Saputra", perusahaan: "PT Sarana Konstruksi Andalan", jabatan: "Operator Forklift" },
  { nama: "Dodi Firmansyah", perusahaan: "PT Bina Cipta Rekayasa", jabatan: "Rigger" },
  { nama: "Asep Kurnia", perusahaan: "PT Bina Cipta Rekayasa", jabatan: "Teknisi Listrik" },
];

const TRAINER = [
  "Ir. Hadi Nugroho, AK3U",
  "Drs. Sutanto Wibowo, M.K3",
  "dr. Anisa Rahmawati, MKK",
  "Bambang Priyanto, CSP",
  "Yohanes Sitorus, Lead Auditor IRCA",
];

/** Tanggal dalam bulan tertentu tahun berjalan, sebagai teks YYYY-MM-DD. */
function tanggal(bulan, hari) {
  return `${TAHUN}-${String(bulan).padStart(2, "0")}-${String(hari).padStart(2, "0")}`;
}

async function seedTraining(client, ctx) {
  const random = seededRandom("training");
  const hariIni = dateOnly(new Date());
  const audit = ctx.audit;

  let programCount = 0;
  let realisasiCount = 0;
  let pesertaCount = 0;

  // Kandidat peserta internal, diambil dari pengguna demo yang memang pekerja
  // atau pengawas — bukan seluruh pengguna. Tenant administrator yang
  // tercatat hadir di pelatihan ruang terbatas akan terbaca sebagai data
  // yang diisi asal.
  const pekerja = ctx.users.filter((user) =>
    ["WORKER_EMPLOYEE", "SUPERVISOR", "HSE_OFFICER", "QC_INSPECTOR", "ENVIRONMENTAL_OFFICER", "TPS_LB3_OFFICER"].includes(
      user.roleCode,
    ),
  );

  for (const program of PROGRAM) {
    const programId = uuidFor("training-program", program.key);
    const picId = ctx.userIds[program.pic] || ctx.userIds.andi;

    await upsert(
      client,
      "training_programs",
      "training_program_id",
      {
        training_program_id: programId,
        // site_id NULL = program tingkat perusahaan. Program pelatihan
        // tahunan memang disusun untuk seluruh perusahaan; pelaksanaannyalah
        // yang terjadi di satu lokasi, dan itu dicatat pada realisasinya.
        site_id: null,
        department_id: ctx.deptIds.hse,
        program_number: `TRN/${TAHUN}/${String(programCount + 1).padStart(3, "0")}`,
        title: program.judul,
        training_type: program.jenis,
        objective: program.wajib
          ? `Memenuhi kewajiban ${program.dasar} dan memastikan pekerja yang menjalankan pekerjaan tersebut kompeten dan bersertifikat sah.`
          : `Meningkatkan kompetensi ${program.sasaran.toLowerCase()} sesuai kebutuhan pengendalian risiko yang teridentifikasi pada HIRA.`,
        target_audience: program.sasaran,
        is_mandatory: program.wajib,
        regulatory_basis: program.dasar,
        planned_participants: program.peserta,
        planned_hours_per_participant: program.jamPerPeserta,
        planned_sessions: program.sesi,
        planned_budget: program.anggaran,
        delivery_method: program.metode,
        provider_name: program.penyelenggara,
        planned_start_date: tanggal(program.bulanMulai, 1),
        planned_end_date: tanggal(program.bulanSelesai, 28),
        fiscal_year: TAHUN,
        certification_required: Boolean(program.sertifikat),
        certificate_validity_months: program.masaBerlakuBulan ?? null,
        pic_user_id: picId,
        status: program.status,
        notes:
          program.status === "DEFERRED"
            ? "Ditunda ke tahun anggaran berikutnya atas keputusan rapat tinjauan manajemen; kebutuhannya tetap tercatat."
            : program.status === "CANCELLED"
              ? "Dibatalkan karena penyelenggara mengubah acara menjadi daring tanpa biaya; kehadiran tetap dilakukan tanpa anggaran."
              : null,
      },
      audit,
    );
    programCount += 1;

    const jumlahRealisasi = REALISASI[program.key] || 0;
    for (let ke = 1; ke <= jumlahRealisasi; ke++) {
      const realisasiId = uuidFor("training-realization", `${program.key}:${ke}`);

      // Sesi disebar merata di sepanjang jendela rencana, bukan diundi:
      // realisasi yang tanggalnya melompat-lompat di luar jendela rencananya
      // membuat perbandingan rencana-vs-realisasi tidak bisa dibaca.
      //
      // JENDELANYA DIPENDEKKAN untuk program berstatus COMPLETED. Program
      // yang dinyatakan selesai tetapi punya sesi bertanggal bulan depan
      // adalah pertentangan yang langsung terlihat begitu seseorang membuka
      // halaman detailnya, dan pertentangan semacam itu jauh lebih merusak
      // daripada data yang sedikit lebih miskin.
      const selesai = program.status === "COMPLETED" ? Math.min(program.bulanSelesai, BULAN_INI) : program.bulanSelesai;
      const mulai = Math.min(program.bulanMulai, selesai);
      const rentang = Math.max(0, selesai - mulai);
      const bulan = mulai + (jumlahRealisasi > 1 ? Math.round((rentang * (ke - 1)) / (jumlahRealisasi - 1)) : 0);
      // Pada bulan berjalan, hari tidak boleh melewati hari ini untuk alasan
      // yang sama.
      const batasHari = bulan === BULAN_INI ? Math.max(2, HARI_INI - 1) : 24;
      const hari = intBetween(random, Math.min(6, batasHari), batasHari);

      const pesertaRencana = Math.max(1, Math.round(program.peserta / program.sesi));
      // Kehadiran nyata selalu SEDIKIT DI BAWAH rencana. Itu keadaan yang
      // sebenarnya di lapangan (ada yang cuti, ada yang dipanggil operasi),
      // dan kehadiran yang selalu 100% justru yang mencurigakan.
      const hadir = Math.max(1, pesertaRencana - intBetween(random, 0, 3));
      const lulus = Math.max(1, hadir - intBetween(random, 0, 2));

      const preTest = intBetween(random, 52, 68) + random();
      const postTest = Math.min(98, preTest + intBetween(random, 16, 30));

      const jam = program.jamPerPeserta;
      const tanggalSesi = tanggal(bulan, hari);
      const sudahLewat = tanggalSesi <= hariIni;

      // Nama ruang dan lokasi kerja dipilih BERSAMAAN, tidak masing-masing.
      // Dipilih terpisah, satu baris bisa berbunyi "Tempat: Aula Terminal
      // Balikpapan" tepat di atas "Lokasi kerja: Kantor Pusat Jakarta" —
      // pertentangan kecil yang justru paling merusak, karena pembacanya
      // menyimpulkan seluruh isi tabelnya diisi acak.
      const lokasi =
        program.metode === "ONLINE"
          ? { siteId: ctx.siteIds.hq, ruang: "Daring (Zoom Meeting)" }
          : pick(random, [
              { siteId: ctx.siteIds.hq, ruang: "Ruang Rapat Utama Kantor Pusat Jakarta" },
              { siteId: ctx.siteIds.cepu, ruang: "Training Center Lapangan Cepu" },
              { siteId: ctx.siteIds.bpn, ruang: "Aula Terminal Balikpapan" },
            ]);

      await upsert(
        client,
        "training_realizations",
        "training_realization_id",
        {
          training_realization_id: realisasiId,
          training_program_id: programId,
          site_id: lokasi.siteId,
          department_id: ctx.deptIds.hse,
          realization_number: `REAL/${TAHUN}/${String(realisasiCount + 1).padStart(3, "0")}`,
          title: jumlahRealisasi > 1 ? `${program.judul} — Angkatan ${ke}` : program.judul,
          training_type: program.jenis,
          session_date: tanggalSesi,
          session_end_date: jam > 8 ? tanggal(bulan, Math.min(28, hari + Math.ceil(jam / 8) - 1)) : null,
          duration_hours: jam,
          delivery_method: program.metode,
          provider_name: program.penyelenggara,
          trainer_name: pick(random, TRAINER),
          location: lokasi.ruang,
          planned_participants: pesertaRencana,
          actual_participants: sudahLewat ? hadir : 0,
          passed_participants: sudahLewat ? lulus : 0,
          actual_cost: sudahLewat ? Math.round((program.anggaran / program.sesi) * (0.86 + random() * 0.22)) : null,
          average_pre_test_score: sudahLewat ? preTest.toFixed(2) : null,
          average_post_test_score: sudahLewat ? postTest.toFixed(2) : null,
          // Keefektifan dinilai dari kenaikan nilai pasca-uji, bukan diundi:
          // penilaian keefektifan yang tidak berhubungan dengan angkanya
          // sendiri adalah kolom yang paling cepat ketahuan diisi asal.
          effectiveness: !sudahLewat
            ? "NOT_EVALUATED"
            : postTest >= 80 && lulus / hadir >= 0.9
              ? "EFFECTIVE"
              : postTest >= 70
                ? "PARTIALLY_EFFECTIVE"
                : "NOT_EFFECTIVE",
          evaluation_method: sudahLewat ? "Uji tulis pra dan pasca pelatihan, ditambah observasi penerapan di tempat kerja setelah 30 hari." : null,
          evaluation_notes: sudahLewat
            ? `Nilai rata-rata naik dari ${preTest.toFixed(1)} menjadi ${postTest.toFixed(1)}. ${lulus} dari ${hadir} peserta memenuhi ambang kelulusan.`
            : null,
          evaluated_by: sudahLewat ? ctx.userIds.andi : null,
          evaluated_date: sudahLewat ? tanggal(bulan, Math.min(28, hari + 7)) : null,
          certificate_issued: Boolean(program.sertifikat) && sudahLewat,
          status: sudahLewat ? "COMPLETED" : "SCHEDULED",
          notes: null,
        },
        audit,
      );
      realisasiCount += 1;

      // Daftar nama peserta hanya untuk pelatihan bersertifikat, dan itu
      // disengaja. Yang butuh daftar nama adalah pelatihan yang menghasilkan
      // sertifikat per orang dengan masa berlaku; mendaftar 200 nama peserta
      // simulasi kebakaran tidak menjawab pertanyaan siapa pun dan hanya
      // membuat halaman detailnya tidak bisa dibaca.
      if (!program.sertifikat || !sudahLewat) continue;

      // Peserta internal dan kontraktor DISELANG-SELING, bukan disambung.
      //
      // Disambung, kontraktor selalu berada di ekor daftar dan tidak pernah
      // ikut terambil pada sesi yang pesertanya sedikit — padahal justru
      // pelatihan bersertifikat berpeserta sedikit (ruang terbatas,
      // ketinggian, pesawat angkat) yang paling sering diisi pekerja
      // kontraktor, dan sertifikat merekalah yang ditanya lebih dulu saat
      // audit CSMS.
      const internal = pekerja.map((user) => ({
        userId: user.id,
        nama: user.fullName,
        perusahaan: "PT Petro Nusantara Sejahtera",
        jabatan: user.jobTitle,
      }));
      const kontraktor = PESERTA_KONTRAKTOR.map((orang) => ({
        userId: null,
        nama: orang.nama,
        perusahaan: orang.perusahaan,
        jabatan: orang.jabatan,
      }));
      // Perbandingan 2 internal : 1 kontraktor.
      const kandidat = [];
      let iInternal = 0;
      let iKontraktor = 0;
      while (iInternal < internal.length || iKontraktor < kontraktor.length) {
        if (iInternal < internal.length) kandidat.push(internal[iInternal++]);
        if (iInternal < internal.length) kandidat.push(internal[iInternal++]);
        if (iKontraktor < kontraktor.length) kandidat.push(kontraktor[iKontraktor++]);
      }

      const jumlahNama = Math.min(hadir, kandidat.length);
      for (let index = 0; index < jumlahNama; index++) {
        const orang = kandidat[index];
        const lulusOrang = index < lulus;
        const nilaiPre = intBetween(random, 45, 70);
        const nilaiPost = lulusOrang ? intBetween(random, 76, 96) : intBetween(random, 55, 69);
        const terbit = tanggal(bulan, Math.min(28, hari + 10));

        await upsert(
          client,
          "training_participants",
          "training_participant_id",
          {
            training_participant_id: uuidFor("training-participant", `${program.key}:${ke}:${index}`),
            training_realization_id: realisasiId,
            user_id: orang.userId,
            participant_name: orang.nama,
            participant_company: orang.perusahaan,
            participant_position: orang.jabatan,
            attendance: "ATTENDED",
            pre_test_score: nilaiPre,
            post_test_score: nilaiPost,
            result: lulusOrang ? "PASSED" : "FAILED",
            // Sertifikat hanya untuk yang lulus. Nomor sertifikat pada
            // peserta yang tidak lulus adalah cacat data yang paling
            // memalukan saat auditor membuka satu baris secara acak.
            certificate_number: lulusOrang
              ? `SERT/${program.key.toUpperCase()}/${TAHUN}/${String(index + 1).padStart(3, "0")}`
              : null,
            certificate_issued_date: lulusOrang ? terbit : null,
            certificate_expiry_date:
              lulusOrang && program.masaBerlakuBulan
                ? dateOnly(new Date(Date.UTC(TAHUN + Math.floor(program.masaBerlakuBulan / 12), bulan - 1, Math.min(28, hari + 10))))
                : null,
          },
          audit,
        );
        pesertaCount += 1;
      }
    }
  }

  // --- Realisasi TANPA program ---------------------------------------------
  //
  // Dua pelatihan yang benar-benar terjadi tapi tidak pernah ada di rencana
  // tahunan. Keduanya adalah kejadian yang paling sering dialami: pelatihan
  // dadakan setelah insiden, dan tawaran pelatihan gratis dari vendor.
  //
  // Baris inilah yang menjelaskan kenapa training_program_id nullable.
  const TANPA_PROGRAM = [
    {
      key: "pasca-insiden",
      judul: "Pelatihan Ulang Penanganan Bahan Kimia Pasca-Insiden Tumpahan Solar",
      jenis: "TECHNICAL_COMPETENCY",
      hariLalu: 42,
      jam: 4,
      hadir: 26,
      catatan:
        "Diselenggarakan sebagai tindakan perbaikan CAPA atas insiden tumpahan solar; tidak masuk program tahunan karena kebutuhannya baru muncul setelah insiden.",
    },
    {
      key: "vendor-apd",
      judul: "Sosialisasi Pemakaian dan Perawatan APD Baru dari Pemasok",
      jenis: "AWARENESS",
      hariLalu: 18,
      jam: 2,
      hadir: 48,
      catatan: "Diselenggarakan pemasok APD tanpa biaya; tidak dianggarkan dalam program tahunan.",
    },
  ];

  for (const sesi of TANPA_PROGRAM) {
    const tanggalSesi = dateOnly(daysAgo(sesi.hariLalu));
    await upsert(
      client,
      "training_realizations",
      "training_realization_id",
      {
        training_realization_id: uuidFor("training-realization", sesi.key),
        training_program_id: null,
        site_id: ctx.siteIds.cepu,
        department_id: ctx.deptIds.hse,
        realization_number: `REAL/${TAHUN}/${String(realisasiCount + 1).padStart(3, "0")}`,
        title: sesi.judul,
        training_type: sesi.jenis,
        session_date: tanggalSesi,
        session_end_date: null,
        duration_hours: sesi.jam,
        delivery_method: "IN_HOUSE",
        provider_name: "Departemen HSE & Quality",
        trainer_name: pick(random, TRAINER),
        location: "Training Center Lapangan Cepu",
        planned_participants: 0,
        actual_participants: sesi.hadir,
        passed_participants: sesi.hadir,
        actual_cost: null,
        average_pre_test_score: null,
        average_post_test_score: null,
        effectiveness: "PARTIALLY_EFFECTIVE",
        evaluation_method: "Observasi penerapan di tempat kerja.",
        evaluation_notes: "Belum diuji tulis; penilaian sementara dari pengamatan pengawas area.",
        evaluated_by: ctx.userIds.andi,
        evaluated_date: dateOnly(daysAgo(Math.max(0, sesi.hariLalu - 14))),
        certificate_issued: false,
        status: "COMPLETED",
        notes: sesi.catatan,
      },
      audit,
    );
    realisasiCount += 1;
  }

  // Penanda bahwa jadwal ke depan memang ada — satu sesi induksi bulan depan.
  // Tanpa satu pun baris berstatus SCHEDULED, modul realisasi terbaca sebagai
  // arsip masa lalu, bukan sebagai jadwal yang dikelola.
  await upsert(
    client,
    "training_realizations",
    "training_realization_id",
    {
      training_realization_id: uuidFor("training-realization", "induksi:mendatang"),
      training_program_id: uuidFor("training-program", "induksi"),
      site_id: ctx.siteIds.cepu,
      department_id: ctx.deptIds.hse,
      realization_number: `REAL/${TAHUN}/${String(realisasiCount + 1).padStart(3, "0")}`,
      title: "Induksi K3 Pekerja Baru, Mutasi, dan Tamu — Angkatan berikutnya",
      training_type: "INDUCTION",
      session_date: dateOnly(daysFromNow(21)),
      duration_hours: 2,
      delivery_method: "IN_HOUSE",
      provider_name: "Departemen HSE & Quality",
      trainer_name: "Dewi Lestari",
      location: "Training Center Lapangan Cepu",
      planned_participants: 20,
      actual_participants: 0,
      passed_participants: 0,
      effectiveness: "NOT_EVALUATED",
      certificate_issued: false,
      status: "SCHEDULED",
      notes: null,
    },
    audit,
  );
  realisasiCount += 1;

  return { trainingPrograms: programCount, trainingRealizations: realisasiCount, trainingParticipants: pesertaCount };
}

module.exports = { seedTraining };
