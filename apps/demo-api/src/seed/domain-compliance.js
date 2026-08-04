// Modul 03 Dokumen Terkendali, Modul 04 Register Peraturan, Modul 05 HIRA,
// Modul 06 Izin Kerja, Modul 14 Rencana Tanggap Darurat.
//
// Isinya ditulis sebagai kalimat kerja yang benar-benar dipakai operator
// migas Indonesia — nomor peraturan yang nyata, nama unit proses yang nyata
// (SP Menggung, tangki T-101, dermaga jetty 3). Data demo yang berisi
// "Dokumen 1", "Dokumen 2" menguji tampilan dengan baik dan menceritakan
// kemampuan sistem dengan buruk; yang dilihat penonton presentasi adalah
// apakah sistem ini mengerti pekerjaan mereka.
//
// Sebaran statusnya juga disengaja. Setiap modul memuat baris yang sedang
// berjalan, baris yang sudah selesai, DAN baris yang terlambat — karena
// nilai perangkat lunak QHSE justru terletak pada yang terlambat, dan daftar
// yang seluruhnya hijau tidak memperlihatkan apa pun tentang itu.
const { uuidFor, upsert, seededRandom, pick, intBetween, dateOnly, daysAgo, daysFromNow, NOW } = require("./lib");
const { actor, actors } = require("./foundation");

const DOCUMENTS = [
  ["SOP", "SOP Izin Kerja Panas (Hot Work Permit)", "SOP", "PUBLISHED", -280, 12],
  ["SOP", "SOP Bekerja di Ruang Terbatas (Confined Space Entry)", "SOP", "PUBLISHED", -265, 12],
  ["SOP", "SOP Isolasi Energi — Lock Out Tag Out (LOTO)", "SOP", "PUBLISHED", -250, 12],
  ["SOP", "SOP Penanganan Tumpahan Minyak di Area Produksi", "SOP", "PUBLISHED", -240, 12],
  ["SOP", "SOP Kerja di Ketinggian dan Penggunaan Full Body Harness", "SOP", "PUBLISHED", -230, 12],
  ["SOP", "SOP Pemuatan dan Pembongkaran BBM di Jetty", "SOP", "PUBLISHED", -215, 12],
  ["SOP", "SOP Pemeriksaan Gas (Gas Testing) Sebelum Pekerjaan Panas", "SOP", "PUBLISHED", -205, 12],
  ["SOP", "SOP Investigasi Insiden dan Analisis Akar Masalah", "SOP", "PUBLISHED", -190, 24],
  ["SOP", "SOP Pengelolaan Limbah B3 di TPS", "SOP", "PUBLISHED", -180, 12],
  ["SOP", "SOP Inspeksi dan Pengujian Alat Pemadam Api Ringan", "SOP", "PUBLISHED", -175, 12],
  ["SOP", "SOP Seleksi dan Evaluasi Kinerja Kontraktor", "SOP", "PUBLISHED", -160, 24],
  ["SOP", "SOP Kalibrasi Alat Ukur dan Penanganan Out of Tolerance", "SOP", "PUBLISHED", -150, 12],
  ["SOP", "SOP Pemeriksaan Kesehatan Berkala Pekerja", "SOP", "PUBLISHED", -140, 24],
  ["SOP", "SOP Manajemen Perubahan (Management of Change)", "SOP", "IN_REVIEW", -30, 24],
  ["SOP", "SOP Penanganan Kebocoran Gas H2S di Wellpad", "SOP", "DRAFT", -12, 12],
  ["SOP", "SOP Pengendalian Pekerjaan Penggalian dan Utilitas Bawah Tanah", "SOP", "UNDER_REVISION", -95, 12],
  ["POL", "Kebijakan K3 dan Lingkungan Perusahaan", "POLICY", "PUBLISHED", -320, 36],
  ["POL", "Kebijakan Mutu PT Petro Nusantara Sejahtera", "POLICY", "PUBLISHED", -318, 36],
  ["POL", "Kebijakan Larangan Narkoba dan Alkohol di Tempat Kerja", "POLICY", "PUBLISHED", -300, 36],
  ["POL", "Kebijakan Stop Work Authority", "POLICY", "PUBLISHED", -295, 36],
  ["MAN", "Manual Sistem Manajemen Terintegrasi QHSE", "MANUAL", "PUBLISHED", -310, 36],
  ["MAN", "Manual Tanggap Darurat Terminal Balikpapan", "MANUAL", "PUBLISHED", -200, 24],
  ["MAN", "Manual Sistem Manajemen Mutu ISO 9001:2015", "MANUAL", "OBSOLETE", -700, 36],
  ["FRM", "Formulir Laporan Nyaris Celaka (Near Miss Report)", "FORM", "PUBLISHED", -260, 24],
];

const REGULATIONS = [
  ["LAW_UU", "UU No. 1 Tahun 1970", "Keselamatan Kerja", "Pemerintah Republik Indonesia", -9000],
  ["LAW_UU", "UU No. 32 Tahun 2009", "Perlindungan dan Pengelolaan Lingkungan Hidup", "Pemerintah Republik Indonesia", -6100],
  ["LAW_UU", "UU No. 13 Tahun 2003", "Ketenagakerjaan", "Pemerintah Republik Indonesia", -8300],
  ["LAW_UU", "UU No. 22 Tahun 2001", "Minyak dan Gas Bumi", "Pemerintah Republik Indonesia", -8900],
  ["GOVERNMENT_REGULATION_PP", "PP No. 50 Tahun 2012", "Penerapan Sistem Manajemen Keselamatan dan Kesehatan Kerja", "Pemerintah Republik Indonesia", -5100],
  ["GOVERNMENT_REGULATION_PP", "PP No. 22 Tahun 2021", "Penyelenggaraan Perlindungan dan Pengelolaan Lingkungan Hidup", "Pemerintah Republik Indonesia", -1900],
  ["GOVERNMENT_REGULATION_PP", "PP No. 88 Tahun 2019", "Kesehatan Kerja", "Pemerintah Republik Indonesia", -2500],
  ["MINISTERIAL_REGULATION_PERMEN", "Permenaker No. 5 Tahun 2018", "Keselamatan dan Kesehatan Kerja Lingkungan Kerja", "Kementerian Ketenagakerjaan", -2900],
  ["MINISTERIAL_REGULATION_PERMEN", "Permenaker No. 8 Tahun 2020", "Pesawat Angkat dan Pesawat Angkut", "Kementerian Ketenagakerjaan", -2200],
  ["MINISTERIAL_REGULATION_PERMEN", "Permenaker No. 9 Tahun 2016", "K3 dalam Pekerjaan pada Ketinggian", "Kementerian Ketenagakerjaan", -3600],
  ["MINISTERIAL_REGULATION_PERMEN", "Permenaker No. 37 Tahun 2016", "K3 Bejana Tekanan dan Tangki Timbun", "Kementerian Ketenagakerjaan", -3500],
  ["MINISTERIAL_REGULATION_PERMEN", "Permen ESDM No. 18 Tahun 2018", "Pemeriksaan Keselamatan Instalasi dan Peralatan Migas", "Kementerian ESDM", -2800],
  ["MINISTERIAL_REGULATION_PERMEN", "PermenLHK No. 6 Tahun 2021", "Tata Cara dan Persyaratan Pengelolaan Limbah B3", "Kementerian LHK", -1800],
  ["MINISTERIAL_DECREE_KEPMEN", "Kepmenaker No. 187 Tahun 1999", "Pengendalian Bahan Kimia Berbahaya di Tempat Kerja", "Kementerian Ketenagakerjaan", -9700],
  ["INTERNATIONAL_STANDARD", "ISO 45001:2018", "Occupational Health and Safety Management Systems", "International Organization for Standardization", -2900],
  ["INTERNATIONAL_STANDARD", "ISO 14001:2015", "Environmental Management Systems", "International Organization for Standardization", -3900],
  ["INTERNATIONAL_STANDARD", "ISO 9001:2015", "Quality Management Systems", "International Organization for Standardization", -3900],
  ["LOCAL_REGULATION_PERDA", "Perda Kota Balikpapan No. 3 Tahun 2019", "Pengelolaan Kualitas Air dan Pengendalian Pencemaran", "Pemerintah Kota Balikpapan", -2400],
];

const HIRA_ACTIVITIES = [
  ["Pengoperasian dan pemantauan rutin Stasiun Pengumpul Menggung", "ROUTINE", "cepu"],
  ["Pekerjaan panas penggantian spool line 6 inci area separator", "NON_ROUTINE", "cepu"],
  ["Masuk ruang terbatas untuk pembersihan tangki timbun T-101", "NON_ROUTINE", "bpn"],
  ["Bongkar muat BBM dari kapal tanker di Jetty 3", "ROUTINE", "bpn"],
  ["Pekerjaan penggalian jalur pipa distribusi sepanjang 400 meter", "PROJECT_BASED", "cepu"],
  ["Pemeliharaan berkala pompa transfer P-201A/B", "ROUTINE", "bpn"],
  ["Pengoperasian genset darurat 500 kVA saat pemadaman", "NON_ROUTINE", "cepu"],
  ["Penanganan dan penyimpanan bahan kimia demulsifier", "ROUTINE", "cepu"],
  ["Pekerjaan di ketinggian pada struktur flare stack", "NON_ROUTINE", "cepu"],
  ["Pengangkatan beban berat menggunakan mobile crane 50 ton", "NON_ROUTINE", "bpn"],
  ["Pengelasan struktur baja pada proyek perluasan tangki", "PROJECT_BASED", "bpn"],
  ["Pemeriksaan dan penggantian katup pengaman (PSV) unit proses", "ROUTINE", "bpn"],
  ["Kegiatan administrasi dan perkantoran kantor pusat", "ROUTINE", "hq"],
  ["Perjalanan dinas kendaraan operasional lintas kabupaten", "ROUTINE", "cepu"],
  ["Peninjauan berkala HIRA seluruh aktivitas Site Cepu", "PERIODIC_REVIEW", "cepu"],
  ["Peninjauan berkala HIRA seluruh aktivitas Terminal Balikpapan", "PERIODIC_REVIEW", "bpn"],
];

const WORK_PERMIT_JOBS = [
  ["HOT", "Pengelasan sambungan pipa 6\" jalur inlet separator V-101", "cepu"],
  ["HOT", "Pemotongan struktur penyangga pipa lama area manifold", "cepu"],
  ["HOT", "Pengelasan patch plate pada dinding tangki T-104", "bpn"],
  ["HOT", "Grinding dan pengelasan dudukan pompa P-305", "bpn"],
  ["CSE", "Pembersihan endapan lumpur dalam tangki timbun T-101", "bpn"],
  ["CSE", "Inspeksi internal bejana tekan V-220 setelah shutdown", "bpn"],
  ["CSE", "Pembersihan sump pit area pengolahan air terproduksi", "cepu"],
  ["HEI", "Penggantian lampu penerangan pada tower flare", "cepu"],
  ["HEI", "Pengecatan struktur atap gudang material", "bpn"],
  ["HEI", "Pemasangan scaffolding untuk perawatan kolom fraksinasi", "bpn"],
  ["EXC", "Penggalian jalur pipa distribusi segmen KM 2+400", "cepu"],
  ["EXC", "Penggalian pondasi rumah pompa baru", "bpn"],
  ["ELE", "Penggantian breaker 380 V panel distribusi MDP-2", "cepu"],
  ["ELE", "Pemeliharaan trafo distribusi 20 kV gardu utama", "bpn"],
  ["GEN", "Penggantian gasket flange jalur air pendingin", "cepu"],
  ["GEN", "Pembersihan filter udara kompresor instrumen", "bpn"],
  ["GEN", "Perawatan taman dan pemotongan rumput area perkantoran", "hq"],
  ["GEN", "Pemasangan rambu K3 baru di area wellpad", "cepu"],
];

const EMERGENCY_PLANS = [
  ["Rencana Tanggap Darurat Kebakaran Tangki Timbun", "FIRE", "LEVEL_3_COMPANY_WIDE_EXTERNAL_AGENCY", "bpn", "APPROVED_ACTIVE"],
  ["Rencana Tanggap Darurat Kebocoran Gas H2S", "HAZMAT_SPILL", "LEVEL_3_COMPANY_WIDE_EXTERNAL_AGENCY", "cepu", "APPROVED_ACTIVE"],
  ["Rencana Tanggap Darurat Tumpahan Minyak ke Perairan", "HAZMAT_SPILL", "LEVEL_3_COMPANY_WIDE_EXTERNAL_AGENCY", "bpn", "APPROVED_ACTIVE"],
  ["Rencana Tanggap Darurat Gempa Bumi", "EARTHQUAKE", "LEVEL_2_SITE_WIDE", "bpn", "APPROVED_ACTIVE"],
  ["Rencana Tanggap Darurat Kecelakaan Kerja Berat", "MEDICAL_EMERGENCY", "LEVEL_2_SITE_WIDE", "cepu", "APPROVED_ACTIVE"],
  ["Rencana Tanggap Darurat Ledakan Unit Proses", "EXPLOSION", "LEVEL_3_COMPANY_WIDE_EXTERNAL_AGENCY", "bpn", "APPROVED_ACTIVE"],
  ["Rencana Tanggap Darurat Banjir Area Lapangan", "FLOOD", "LEVEL_2_SITE_WIDE", "cepu", "APPROVED_ACTIVE"],
  ["Rencana Tanggap Darurat Kebakaran Gedung Kantor", "FIRE", "LEVEL_1_LOCAL", "hq", "APPROVED_ACTIVE"],
  ["Rencana Tanggap Darurat Ancaman Keamanan dan Demonstrasi", "SECURITY_THREAT", "LEVEL_2_SITE_WIDE", "cepu", "UNDER_REVIEW"],
  ["Rencana Tanggap Darurat Cuaca Ekstrem Operasi Jetty", "SEVERE_WEATHER", "LEVEL_2_SITE_WIDE", "bpn", "DRAFT"],
];

async function seedCompliance(client, ctx, ref) {
  const random = seededRandom("compliance");
  const controller = actor(ctx, "DOCUMENT_CONTROLLER");
  const compliance = actor(ctx, "COMPLIANCE_OFFICER");
  const hseManager = actor(ctx, "HSE_MANAGER");
  const supervisors = actors(ctx, "SUPERVISOR");
  const hseOfficers = actors(ctx, "HSE_OFFICER");
  const workers = actors(ctx, "WORKER_EMPLOYEE");

  // --- Modul 03: dokumen terkendali ---
  //
  // `description` diisi RINGKASAN ISI dokumennya — tujuan, ruang lingkup,
  // acuan, dan pokok langkahnya — bukan satu kalimat penjelas. Alasannya
  // langsung: data demo ini tidak mengunggah satu pun berkas PDF, jadi
  // kalau kolom ini kosong maka membuka sebuah dokumen tidak
  // memperlihatkan apa pun tentang dokumen itu, dan modul dokumen
  // terkendali kehilangan seluruh maknanya di layar.
  // POKOK KETENTUAN yang KHAS per dokumen, dicocokkan dari kata kunci judulnya.
  //
  // Sebelumnya paragraf ini sama persis untuk seluruh 24 dokumen, dan itu
  // merusak lebih dari sekadar keasrian data: pencarian kata kunci pada
  // uraian dokumen mengembalikan SELURUH dokumen untuk hampir setiap kata,
  // karena setiap kata memang ada di setiap dokumen. Ketahuan saat menguji
  // pencarian — "alat pelindung diri" cocok dengan 24 dari 24 dokumen.
  //
  // Isinya sengaja memakai istilah yang sungguh dipakai di lapangan (nama
  // formulir, ambang angka, nama alat), karena justru itulah yang diketik
  // orang di kotak pencarian.
  const KETENTUAN = [
    [/izin kerja panas|hot work/i, "(1) Izin kerja panas diterbitkan Area Authority dan disetujui HSE untuk pekerjaan berisiko tinggi. (2) Pengukuran gas mudah terbakar wajib menunjukkan 0% LEL sebelum percikan pertama. (3) Radius 11 meter dibersihkan dari bahan mudah terbakar dan ditutup selimut tahan api. (4) Fire watch berjaga selama pekerjaan dan 30 menit sesudahnya. (5) Izin berlaku maksimal satu shift dan wajib diperbarui bila kondisi berubah."],
    [/ruang terbatas|confined space/i, "(1) Ruang terbatas hanya dimasuki dengan izin masuk dan daftar pekerja yang dicatat penjaga lubang. (2) Kadar oksigen wajib 19,5%–23,5%, H2S di bawah 10 ppm, dan gas mudah terbakar 0% LEL. (3) Ventilasi paksa dijalankan sebelum dan selama pekerjaan. (4) Penjaga lubang (hole watch) dilarang meninggalkan posisi. (5) Rencana penyelamatan dan alat angkat tersedia sebelum orang pertama masuk."],
    [/isolasi energi|lock out|loto/i, "(1) Seluruh sumber energi diidentifikasi dalam daftar titik isolasi sebelum pekerjaan. (2) Setiap pekerja memasang gembok dan label pribadi pada kotak isolasi. (3) Energi sisa dilepaskan dan diuji nol sebelum pekerjaan dimulai. (4) Pelepasan gembok hanya oleh pemasangnya sendiri. (5) Gembok yatim dibuka lewat prosedur pelepasan paksa dengan persetujuan Manajer HSE."],
    [/tumpahan minyak|tumpahan/i, "(1) Tumpahan dilaporkan ke Control Room dalam 5 menit sejak diketahui. (2) Sumber tumpahan dihentikan bila aman dilakukan. (3) Oil boom dan absorbent pad dipasang untuk mencegah penyebaran ke saluran air. (4) Limbah hasil penanganan dikelola sebagai limbah B3. (5) Tumpahan di atas 15 liter dilaporkan ke instansi lingkungan sesuai ketentuan."],
    [/ketinggian|harness/i, "(1) Pekerjaan di atas 1,8 meter wajib memakai full body harness dengan double lanyard. (2) Titik angkur menahan beban minimal 15 kN dan diperiksa sebelum dipakai. (3) Perancah diperiksa dan diberi scafftag hijau sebelum digunakan. (4) Area di bawah pekerjaan dibarikade untuk mencegah benda jatuh. (5) Pekerja dengan riwayat vertigo atau tekanan darah tidak terkendali tidak diizinkan bekerja di ketinggian."],
    [/jetty|pemuatan|pembongkaran|bbm/i, "(1) Pemeriksaan sebelum sandar mencakup ship-shore safety checklist yang ditandatangani kedua pihak. (2) Kabel bonding dipasang sebelum selang dihubungkan. (3) Laju alir awal dibatasi hingga jalur terisi penuh untuk mencegah listrik statis. (4) Emergency shutdown diuji sebelum pemuatan dimulai. (5) Pemuatan dihentikan saat petir terdeteksi dalam radius 8 km."],
    [/pemeriksaan gas|gas testing/i, "(1) Detektor gas dikalibrasi dan diuji bump test pada hari pemakaian. (2) Pengukuran dilakukan pada tiga tinggi: dasar, tengah, dan atas ruang. (3) Hasil dicatat pada formulir pemeriksaan gas beserta jam pengukuran. (4) Pengukuran ulang dilakukan setiap 2 jam atau setelah pekerjaan terhenti. (5) Pekerjaan dihentikan bila LEL melebihi 0% atau H2S terdeteksi."],
    [/investigasi insiden|akar masalah/i, "(1) Lokasi insiden diamankan dan bukti dikumpulkan sebelum berubah. (2) Investigasi dimulai maksimal 24 jam setelah kejadian. (3) Analisis akar masalah memakai metode 5 Why dan diagram tulang ikan. (4) Tindakan perbaikan diterbitkan sebagai CAPA dengan penanggung jawab dan tenggat. (5) Pembelajaran disebarkan lewat safety alert ke seluruh area dalam 7 hari."],
    [/limbah b3|limbah/i, "(1) Limbah B3 dipilah dan diberi simbol serta label sesuai karakteristiknya. (2) Penyimpanan di TPS tidak melebihi 90 hari sejak tanggal masuk. (3) Neraca limbah dicatat pada logbook TPS setiap penerimaan dan pengeluaran. (4) Pengangkutan hanya oleh pengangkut berizin dengan manifes elektronik. (5) Ceceran di TPS ditangani seketika dan dicatat sebagai kejadian lingkungan."],
    [/pemadam api|apar/i, "(1) APAR diperiksa visual setiap bulan dan diuji isi setiap 12 bulan. (2) Tekanan jarum harus berada di zona hijau dan segel dalam keadaan utuh. (3) Kartu pemeriksaan ditempel pada tiap tabung dan diisi pemeriksa. (4) APAR yang terpakai walau sebentar langsung ditarik untuk diisi ulang. (5) Akses ke APAR bebas hambatan sejauh minimal 1 meter."],
    [/kontraktor/i, "(1) Kontraktor dinilai kelayakan HSE-nya sebelum masuk daftar rekanan. (2) Penilaian mencakup statistik kecelakaan, sertifikat, dan kesiapan alat. (3) Kinerja dievaluasi tiap kuartal memakai kartu skor HSE. (4) Nilai di bawah ambang menghentikan penugasan pekerjaan baru. (5) Hasil evaluasi menjadi dasar perpanjangan kontrak."],
    [/kalibrasi|out of tolerance/i, "(1) Seluruh alat ukur terdaftar beserta rentang dan siklus kalibrasinya. (2) Kalibrasi dilakukan laboratorium terakreditasi KAN dengan sertifikat tertelusur. (3) Alat lulus diberi label kalibrasi berisi tanggal dan masa berlaku. (4) Alat out of tolerance ditarik dan hasil pengukuran sebelumnya ditinjau ulang. (5) Alat rusak diberi label larangan pakai dan dipisahkan."],
    [/kesehatan berkala|medical check/i, "(1) Pemeriksaan kesehatan berkala dilakukan minimal setahun sekali. (2) Jenis pemeriksaan mengikuti pajanan pekerjaan: audiometri, spirometri, dan darah lengkap. (3) Hasil bersifat rahasia dan hanya diakses dokter perusahaan. (4) Status fit to work disampaikan ke atasan tanpa memuat rincian diagnosis. (5) Pekerja dengan pembatasan kerja diberikan penugasan terbatas sesuai anjuran dokter."],
    [/manajemen perubahan|management of change/i, "(1) Setiap perubahan proses, peralatan, atau organisasi diajukan lewat formulir MOC. (2) Kajian risiko perubahan wajib dilakukan sebelum persetujuan. (3) Perubahan sementara diberi batas waktu dan ditinjau saat berakhir. (4) Dokumen, gambar, dan pelatihan diperbarui sebelum perubahan dijalankan. (5) Penutupan MOC memerlukan verifikasi lapangan."],
    [/h2s|kebocoran gas/i, "(1) Detektor H2S tetap dipasang di wellpad dan diuji fungsi setiap minggu. (2) Alarm tahap pertama berbunyi pada 10 ppm, evakuasi pada 20 ppm. (3) Pekerja bergerak melawan arah angin menuju titik kumpul sesuai wind sock. (4) SCBA tersedia di jalur evakuasi dan hanya dipakai personel terlatih. (5) Area hanya dinyatakan aman setelah pengukuran ulang oleh petugas HSE."],
    [/penggalian|utilitas bawah tanah/i, "(1) Izin penggalian diterbitkan setelah pemetaan utilitas bawah tanah. (2) Penggalian di atas 1,2 meter memerlukan penopang dinding atau kemiringan aman. (3) Jalur masuk dan keluar tersedia setiap 7,5 meter panjang galian. (4) Material galian ditempatkan minimal 0,6 meter dari tepi. (5) Galian diperiksa ulang setiap pagi dan setelah hujan."],
    [/nyaris celaka|near miss/i, "(1) Setiap orang boleh melaporkan nyaris celaka tanpa takut disalahkan. (2) Laporan disampaikan pada hari kejadian lewat formulir atau kartu observasi. (3) Laporan ditelaah HSE dalam 3 hari kerja. (4) Kejadian berpotensi keparahan tinggi diinvestigasi seperti insiden sungguhan. (5) Jumlah laporan menjadi indikator kepedulian, bukan indikator buruknya kinerja."],
    [/narkoba|alkohol/i, "(1) Perusahaan menetapkan kadar alkohol nol bagi seluruh pekerja di area operasi. (2) Pengujian acak dilakukan minimal dua kali setahun. (3) Pengujian juga dilakukan setelah insiden yang melibatkan pekerja. (4) Hasil positif menghentikan penugasan seketika dan diproses sesuai peraturan perusahaan. (5) Pekerja yang melapor sukarela sebelum pengujian diberikan jalur pemulihan."],
    [/stop work/i, "(1) Setiap pekerja, tanpa memandang jabatan, berwenang menghentikan pekerjaan yang tidak aman. (2) Penghentian tidak memerlukan izin atasan dan tidak boleh berbuah sanksi. (3) Pekerjaan hanya dilanjutkan setelah bahaya dikendalikan dan diverifikasi. (4) Setiap penggunaan wewenang ini dicatat dan ditelaah. (5) Manajemen wajib mendukung keputusan penghentian di depan umum."],
    [/tanggap darurat/i, "(1) Skenario darurat mencakup kebakaran, tumpahan, kebocoran gas, dan gempa. (2) Latihan darurat diselenggarakan minimal dua kali setahun per lokasi. (3) Titik kumpul dan jalur evakuasi ditandai dan bebas hambatan. (4) Struktur komando insiden ditetapkan beserta penggantinya. (5) Hasil evaluasi latihan menjadi dasar perbaikan rencana."],
    [/k3 dan lingkungan/i, "(1) Perusahaan menetapkan pencegahan cedera dan pencemaran sebagai prioritas yang setara dengan produksi. (2) Kepatuhan pada peraturan K3 dan lingkungan adalah batas terendah, bukan sasaran. (3) Setiap pekerja berhak atas tempat kerja yang aman dan berkewajiban menjaganya. (4) Konsultasi dan partisipasi pekerja dijalankan lewat P2K3. (5) Kebijakan ini dikomunikasikan ke seluruh pekerja, kontraktor, dan tamu."],
    [/terintegrasi|smt qhse/i, "(1) Sistem manajemen menggabungkan ISO 9001, ISO 14001, dan ISO 45001 dalam satu kerangka. (2) Konteks organisasi serta pihak berkepentingan ditetapkan dan ditinjau tahunan. (3) Risiko dan peluang dikelola dalam satu daftar terpadu. (4) Audit internal menilai ketiga standar dalam satu program. (5) Tinjauan manajemen membahas kinerja mutu, lingkungan, dan K3 sekaligus."],
    [/mutu|iso 9001/i, "(1) Sasaran mutu ditetapkan terukur dan ditinjau pada rapat tinjauan manajemen. (2) Proses dipetakan beserta masukan, keluaran, dan indikator kinerjanya. (3) Ketidaksesuaian dicatat sebagai NCR dengan tindakan koreksi terverifikasi. (4) Kepuasan pelanggan diukur dan hasilnya menjadi masukan perbaikan. (5) Audit internal dijalankan sesuai program tahunan."],
  ];

  function pokokKetentuan(title) {
    const cocok = KETENTUAN.find(([pola]) => pola.test(title));
    return cocok
      ? `POKOK KETENTUAN — ${cocok[1]}`
      : "POKOK KETENTUAN — (1) Identifikasi bahaya dan penilaian risiko dilakukan sebelum pekerjaan dimulai. (2) Persyaratan izin, kompetensi, dan alat pelindung diri dipenuhi sebelum pelaksanaan. (3) Pengawas melakukan verifikasi lapangan dan mencatat hasilnya. (4) Penyimpangan dihentikan seketika lewat Stop Work Authority dan dilaporkan pada hari yang sama. (5) Rekaman pelaksanaan disimpan sesuai masa retensi yang ditetapkan.";
  }

  function isiDokumen(title, documentType, categoryCode) {
    const acuan =
      categoryCode === "POL"
        ? "UU No. 1 Tahun 1970, PP No. 50 Tahun 2012, ISO 45001:2018 klausul 5.2"
        : categoryCode === "MAN"
          ? "ISO 9001:2015, ISO 14001:2015, ISO 45001:2018"
          : "PP No. 50 Tahun 2012, Permenaker No. 5 Tahun 2018, Manual SMT QHSE PNS-MAN-001";
    const lingkup =
      documentType === "POLICY"
        ? "Berlaku bagi seluruh pekerja, kontraktor, dan tamu di seluruh wilayah operasi PT Petro Nusantara Sejahtera."
        : "Berlaku untuk seluruh kegiatan terkait di Lapangan Produksi Cepu dan Terminal & Kilang Balikpapan, termasuk pekerjaan yang dilaksanakan kontraktor.";
    return [
      `TUJUAN — ${title} disusun untuk memastikan kegiatan terkait dilaksanakan secara konsisten, aman, dan memenuhi ketentuan peraturan yang berlaku.`,
      `RUANG LINGKUP — ${lingkup}`,
      `ACUAN — ${acuan}.`,
      "TANGGUNG JAWAB — Manajer HSE menetapkan dan meninjau dokumen ini; Supervisor area memastikan pelaksanaannya di lapangan; setiap pekerja wajib mematuhi ketentuan yang diatur di dalamnya.",
      pokokKetentuan(title),
      "PENINJAUAN — Dokumen ditinjau sesuai siklus yang ditetapkan, atau lebih awal bila terjadi perubahan proses, peraturan, atau setelah insiden yang relevan.",
    ].join("\n\n");
  }

  let documentSequence = 0;
  for (const [categoryCode, title, documentType, status, effectiveOffset, cycleMonths] of DOCUMENTS) {
    documentSequence += 1;
    const number = `DOC/${categoryCode}/2026/${String(documentSequence).padStart(3, "0")}`;
    const effective = status === "DRAFT" ? null : daysAgo(-effectiveOffset);
    const nextReview = effective ? new Date(effective.getTime()) : null;
    if (nextReview) nextReview.setMonth(nextReview.getMonth() + cycleMonths);

    await upsert(
      client,
      "documents",
      "document_id",
      {
        document_id: uuidFor("document", number),
        document_number: number,
        title,
        document_type: documentType,
        document_category_id: ref.documentCategories[categoryCode],
        owner_user_id: pick(random, [hseManager, controller, ...supervisors]).id,
        status,
        description: isiDokumen(title, documentType, categoryCode),
        classification: documentType === "POLICY" ? "PUBLIC" : "INTERNAL",
        effective_date: effective ? dateOnly(effective) : null,
        next_review_date: nextReview ? dateOnly(nextReview) : null,
        review_cycle_months: cycleMonths,
        retention_years: documentType === "POLICY" ? 10 : 5,
      },
      ctx.audit,
    );
  }

  // --- Modul 04: register peraturan ---
  let regulationSequence = 0;
  for (const [type, number, title, authority, effectiveOffset] of REGULATIONS) {
    regulationSequence += 1;
    // Peraturan ditinjau ulang setahun sekali. Sebagian sengaja sudah lewat
    // jatuh tempo — itu justru gunanya register kepatuhan.
    const reviewOffset = regulationSequence % 5 === 0 ? -intBetween(random, 5, 60) : intBetween(random, 20, 330);
    await upsert(
      client,
      "regulatory_register",
      "regulatory_register_id",
      {
        regulatory_register_id: uuidFor("regulation", number),
        regulation_type: type,
        regulation_number: number,
        title,
        issuing_authority: authority,
        summary:
          `${title}. Peraturan ini diacu dalam operasi hulu dan hilir PT Petro Nusantara Sejahtera. ` +
          "Kewajiban turunannya diuraikan pada daftar kewajiban kepatuhan di halaman ini, lengkap dengan penanggung jawab dan jatuh temponya.",
        issue_date: dateOnly(daysAgo(-effectiveOffset - 30)),
        source_url: "https://peraturan.go.id/",
        review_cycle_months: 12,
        effective_date: dateOnly(daysAgo(-effectiveOffset)),
        next_review_date: dateOnly(daysFromNow(reviewOffset)),
        status: title.includes("ISO 9001") ? "ACTIVE" : "ACTIVE",
        company_id: ctx.companyId,
        identified_by: compliance.id,
      },
      ctx.audit,
    );
  }

  // --- Modul 05: HIRA ---
  const HIRA_STATUSES = ["ACTIVE", "ACTIVE", "ACTIVE", "APPROVED", "IN_REVIEW", "DRAFT", "REQUIRES_REVISION"];
  let hiraSequence = 0;
  for (const [activity, assessmentType, siteKey] of HIRA_ACTIVITIES) {
    hiraSequence += 1;
    const number = `HIRA/${siteKey.toUpperCase()}/2026/${String(hiraSequence).padStart(3, "0")}`;
    const assessedDaysAgo = intBetween(random, 20, 330);
    const reviewDue = daysFromNow(365 - assessedDaysAgo - (hiraSequence % 6 === 0 ? 400 : 0));
    await upsert(
      client,
      "hira_assessments",
      "hira_id",
      {
        hira_id: uuidFor("hira", number),
        hira_number: number,
        risk_matrix_config_id: ref.riskMatrixConfigId,
        site_id: ctx.siteIds[siteKey],
        department_id: siteKey === "cepu" ? ctx.deptIds.ops : siteKey === "bpn" ? ctx.deptIds.mtc : ctx.deptIds.hse,
        activity_description: activity,
        assessment_type: assessmentType,
        status: HIRA_STATUSES[hiraSequence % HIRA_STATUSES.length],
        assessment_date: dateOnly(daysAgo(assessedDaysAgo)),
        review_due_date: dateOnly(reviewDue),
        assessed_by: pick(random, hseOfficers).id,
        review_cycle_months: 12,
      },
      ctx.audit,
    );
  }

  // --- Modul 06: izin kerja ---
  // Sebaran statusnya mengikuti bentuk yang sebenarnya terjadi di lapangan:
  // sebagian besar izin lama sudah ditutup, beberapa sedang berjalan hari
  // ini, dan sedikit yang tertahan menunggu persetujuan.
  const PERMIT_PLAN = [
    { status: "ACTIVE", startOffset: -1, durationHours: 30 },
    { status: "ACTIVE", startOffset: 0, durationHours: 8 },
    { status: "PENDING_HSE_APPROVAL", startOffset: 1, durationHours: 10 },
    { status: "PENDING_ISSUER_APPROVAL", startOffset: 2, durationHours: 6 },
    { status: "APPROVED", startOffset: 1, durationHours: 12 },
    { status: "DRAFT", startOffset: 4, durationHours: 8 },
    { status: "REJECTED", startOffset: -3, durationHours: 8 },
    { status: "EXPIRED", startOffset: -9, durationHours: 8 },
  ];

  let permitSequence = 0;
  for (let round = 0; round < 3; round++) {
    for (const [typeCode, jobTitle, siteKey] of WORK_PERMIT_JOBS) {
      permitSequence += 1;
      // Ronde 0 dan 1 mengisi riwayat (semuanya sudah ditutup), ronde 2
      // mengisi keadaan hari ini.
      const plan =
        round < 2
          ? { status: "CLOSED", startOffset: -(intBetween(random, 10, 240)), durationHours: intBetween(random, 4, 24) }
          : PERMIT_PLAN[permitSequence % PERMIT_PLAN.length];

      const number = `PTW/${typeCode}/2026/${String(permitSequence).padStart(4, "0")}`;
      const start = new Date(NOW.getTime() + plan.startOffset * 24 * 60 * 60 * 1000);
      start.setHours(7 + (permitSequence % 4), 0, 0, 0);
      const end = new Date(start.getTime() + plan.durationHours * 60 * 60 * 1000);
      const riskLevel = typeCode === "GEN" ? "LOW" : typeCode === "EXC" ? "MEDIUM" : "HIGH";

      await upsert(
        client,
        "work_permits",
        "work_permit_id",
        {
          work_permit_id: uuidFor("work-permit", number),
          permit_number: number,
          work_permit_type_id: ref.workPermitTypes[typeCode],
          company_id: ctx.companyId,
          site_id: ctx.siteIds[siteKey],
          department_id: siteKey === "cepu" ? ctx.deptIds.ops : siteKey === "bpn" ? ctx.deptIds.mtc : ctx.deptIds.hse,
          title: jobTitle,
          description: `${jobTitle}. Pekerjaan dilaksanakan sesuai SOP terkait, JSA telah dikomunikasikan kepada seluruh pekerja, dan APD wajib sesuai matriks area.`,
          // Hanya area spesifiknya. Nama lokasi besarnya sudah tampil di
          // baris "Lokasi kerja" tepat di atasnya, dan mengulangnya membuat
          // dua baris berturut-turut mengatakan hal yang sama.
          location_detail:
            siteKey === "cepu"
              ? "Stasiun Pengumpul Menggung, area separator V-101"
              : siteKey === "bpn"
                ? "Area tangki timbun, dekat manifold jalur 6 inci"
                : "Halaman dan area parkir gedung kantor",
          requester_id: pick(random, [...supervisors, ...workers]).id,
          risk_level: riskLevel,
          status: plan.status,
          planned_start_datetime: start,
          planned_end_datetime: end,
          // Realisasi hanya ada untuk izin yang benar-benar sudah berjalan.
          // Izin berstatus DRAFT yang punya jam mulai aktual adalah jenis
          // ketidakcocokan yang langsung terlihat oleh orang lapangan.
          actual_start_datetime: ["CLOSED", "ACTIVE", "EXPIRED"].includes(plan.status) ? start : null,
          actual_end_datetime: plan.status === "CLOSED" ? end : null,
          number_of_workers: intBetween(random, 2, 12),
        },
        ctx.audit,
      );
    }
  }

  // --- Modul 14: rencana tanggap darurat ---
  let planSequence = 0;
  for (const [planTitle, emergencyType, severity, siteKey, status] of EMERGENCY_PLANS) {
    planSequence += 1;
    const number = `ERP/2026/${String(planSequence).padStart(3, "0")}`;
    // Satu rencana sengaja lewat jatuh tempo tinjauan — pemicu yang dipakai
    // emergency-plan-review-overdue-scan di apps/api.
    const reviewOffset = planSequence === 3 ? -45 : intBetween(random, 30, 300);
    await upsert(
      client,
      "emergency_response_plans",
      "emergency_response_plan_id",
      {
        emergency_response_plan_id: uuidFor("erp", number),
        plan_number: number,
        company_id: ctx.companyId,
        site_id: ctx.siteIds[siteKey],
        plan_title: planTitle,
        emergency_type: emergencyType,
        severity_level: severity,
        scenario_description: `${planTitle}. Skenario mencakup deteksi dini, pembunyian alarm, evakuasi ke titik kumpul, penanganan awal oleh tim tanggap darurat, dan eskalasi ke instansi eksternal bila diperlukan.`,
        status,
        version_number: 2,
        effective_date: status === "APPROVED_ACTIVE" ? dateOnly(daysAgo(intBetween(random, 200, 600))) : null,
        last_reviewed_date: status === "DRAFT" ? null : dateOnly(daysAgo(intBetween(random, 60, 340))),
        reviewed_by: status === "DRAFT" ? null : hseManager.id,
        next_review_due_date: dateOnly(daysFromNow(reviewOffset)),
        approved_by: status === "APPROVED_ACTIVE" ? hseManager.id : null,
        approved_at: status === "APPROVED_ACTIVE" ? daysAgo(intBetween(random, 60, 300)) : null,
      },
      ctx.audit,
    );
  }

  return { documents: DOCUMENTS.length, regulations: REGULATIONS.length, hira: HIRA_ACTIVITIES.length, workPermits: permitSequence, emergencyPlans: EMERGENCY_PLANS.length };
}

module.exports = { seedCompliance };
