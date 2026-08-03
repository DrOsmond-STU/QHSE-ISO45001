// Modul 12 Aspek & Dampak Lingkungan, Modul 13 Penugasan Kerja Terbatas,
// Modul 15 Aset & Peralatan, Modul 16 Kalibrasi, Modul 17 Kontraktor.
//
// Kalibrasi disemai dari aset, bukan berdiri sendiri: setiap item kalibrasi
// menunjuk aset instrumentasi yang memang ada di modul aset, sehingga tag
// peralatan yang muncul di kedua modul benar-benar peralatan yang sama.
//
// Penugasan kerja terbatas selalu menunjuk satu penilaian kelayakan kerja
// (fit to work) sebagai dasarnya — kolomnya NOT NULL, dan memang begitu
// seharusnya: pembatasan tugas tanpa dasar penilaian medis adalah keputusan
// yang tidak bisa dipertanggungjawabkan. Yang disemai di sini hanya lapisan
// non-klinisnya; rekam medis, hasil MCU, dan kasus penyakit akibat kerja
// TIDAK disentuh sama sekali karena berada di balik enkripsi PHI dan
// otorisasi per pengguna yang tidak boleh diakali oleh skrip demo.
const { uuidFor, upsert, seededRandom, pick, intBetween, dateOnly, daysAgo, daysFromNow } = require("./lib");
const { actor, actors } = require("./foundation");

const ENV_ASPECTS = [
  ["Pembakaran gas suar (flaring) rutin", "Emisi CO2, NOx, dan SO2 ke udara ambien", "AIR", "NORMAL", "cepu", true],
  ["Pengoperasian genset diesel 500 kVA", "Emisi gas buang dan partikulat", "AIR", "NORMAL", "cepu", true],
  ["Pembuangan air terproduksi setelah pengolahan", "Penurunan kualitas badan air penerima", "WATER", "NORMAL", "cepu", true],
  ["Pencucian peralatan proses di area workshop", "Air limbah mengandung minyak dan detergen", "WATER", "NORMAL", "bpn", true],
  ["Penyimpanan sementara limbah B3 di TPS", "Potensi pencemaran tanah bila terjadi kebocoran", "LAND_SOIL", "ABNORMAL", "bpn", true],
  ["Kegiatan pengeboran dan penanganan serbuk bor", "Timbulan limbah padat dan potensi pencemaran tanah", "WASTE", "NORMAL", "cepu", true],
  ["Pengoperasian kompresor gas", "Kebisingan melebihi 85 dBA di area sekitar", "NOISE", "NORMAL", "cepu", true],
  ["Lalu lintas kendaraan berat di jalan akses", "Kebisingan dan debu jalan bagi permukiman sekitar", "NOISE", "NORMAL", "cepu", false],
  ["Penggunaan air tanah untuk kebutuhan operasi", "Penurunan muka air tanah setempat", "RESOURCE_CONSUMPTION", "NORMAL", "bpn", true],
  ["Konsumsi listrik jaringan untuk perkantoran", "Konsumsi sumber daya tak terbarukan", "RESOURCE_CONSUMPTION", "NORMAL", "hq", false],
  ["Tumpahan minyak dari kegagalan flange", "Pencemaran tanah dan potensi badan air", "LAND_SOIL", "EMERGENCY", "cepu", true],
  ["Kebakaran tangki timbun", "Emisi asap pekat dan pencemaran udara luas", "AIR", "EMERGENCY", "bpn", true],
  ["Penanganan bahan kimia demulsifier", "Potensi ceceran bahan kimia ke saluran drainase", "WATER", "ABNORMAL", "cepu", true],
  ["Timbulan limbah domestik dari kantin dan mess", "Timbulan sampah padat non-B3", "WASTE", "NORMAL", "cepu", false],
  ["Penggantian oli pelumas mesin rotating", "Timbulan oli bekas sebagai limbah B3", "WASTE", "NORMAL", "bpn", true],
  ["Pembersihan tangki timbun (tank cleaning)", "Timbulan sludge minyak dalam jumlah besar", "WASTE", "ABNORMAL", "bpn", true],
  ["Pembukaan lahan untuk jalur pipa baru", "Gangguan vegetasi dan habitat setempat", "BIODIVERSITY", "NORMAL", "cepu", true],
  ["Bongkar muat BBM di dermaga", "Potensi ceceran minyak ke perairan pesisir", "WATER", "ABNORMAL", "bpn", true],
  ["Penggunaan kertas dan alat tulis kantor", "Konsumsi sumber daya dan timbulan sampah kertas", "RESOURCE_CONSUMPTION", "NORMAL", "hq", false],
  ["Pengoperasian boiler unit proses", "Emisi gas buang dari cerobong", "AIR", "NORMAL", "bpn", true],
];

const RESTRICTED_DUTIES = [
  ["joko", "NO_HEIGHT_WORK", "Ditugaskan pada pemantauan panel ruang kontrol dan administrasi shift, tanpa pekerjaan di ketinggian.", "cepu", "POST_INCIDENT", "FIT_WITH_RESTRICTION", -40, 45],
  ["bambang", "NO_HEAVY_LIFTING", "Ditugaskan pada pemeriksaan visual peralatan dan pencatatan, batas angkat maksimum 5 kg.", "cepu", "POST_SICK_LEAVE", "FIT_WITH_RESTRICTION", -25, 30],
  ["fitri", "REDUCED_HOURS", "Jam kerja dibatasi 6 jam per hari tanpa lembur selama masa pemulihan.", "bpn", "POST_MCU", "FIT_WITH_RESTRICTION", -18, 60],
  ["eko", "NO_CONFINED_SPACE", "Ditugaskan pada kalibrasi instrumen di bengkel, tidak masuk ruang terbatas.", "bpn", "POST_MCU", "FIT_WITH_RESTRICTION", -60, 90],
  ["joko", "NO_NIGHT_SHIFT", "Dijadwalkan hanya pada shift pagi atas rekomendasi dokter perusahaan.", "cepu", "ROUTINE", "FIT_WITH_RESTRICTION", -150, 60],
  ["bambang", "LIGHT_DUTY_ONLY", "Ditugaskan pada pekerjaan administrasi gudang selama masa pemulihan pasca cedera punggung.", "cepu", "POST_INCIDENT", "TEMPORARY_UNFIT", -200, 45],
  ["fitri", "NO_CHEMICAL_EXPOSURE", "Dijauhkan dari area penanganan bahan kimia sampai hasil pemeriksaan ulang keluar.", "bpn", "POST_MCU", "FIT_WITH_RESTRICTION", -95, 30],
  ["eko", "NO_HEIGHT_WORK", "Ditugaskan pada pemeriksaan instrumentasi di ketinggian rendah dan pekerjaan bengkel.", "bpn", "PRE_ASSIGNMENT_HIGH_RISK_TASK", "FIT_WITH_RESTRICTION", -8, 30],
];

const ASSETS = [
  ["rotating", "Pompa Transfer Minyak Mentah P-201A", "Sulzer", "cepu", true],
  ["rotating", "Pompa Transfer Minyak Mentah P-201B", "Sulzer", "cepu", true],
  ["rotating", "Pompa Booster P-305", "Grundfos", "bpn", true],
  ["rotating", "Kompresor Gas K-101", "Ariel", "cepu", true],
  ["rotating", "Kompresor Udara Instrumen K-210", "Atlas Copco", "bpn", false],
  ["rotating", "Blower Sistem Ventilasi B-115", "Howden", "bpn", false],
  ["rotating", "Pompa Pemadam Kebakaran Diesel FP-01", "Clarke", "bpn", true],
  ["rotating", "Pompa Jockey Sistem Hidran JP-01", "Grundfos", "bpn", true],
  ["static", "Separator Tiga Fasa V-101", "PT Rekayasa Industri", "cepu", true],
  ["static", "Bejana Tekan Scrubber V-220", "PT Rekayasa Industri", "bpn", true],
  ["static", "Tangki Timbun T-101 kapasitas 5.000 KL", "PT Barata Indonesia", "bpn", true],
  ["static", "Tangki Timbun T-104 kapasitas 3.000 KL", "PT Barata Indonesia", "bpn", true],
  ["static", "Heat Exchanger E-310", "Alfa Laval", "bpn", false],
  ["static", "Knock Out Drum D-105", "PT Rekayasa Industri", "cepu", true],
  ["static", "Flare Stack FS-01", "Zeeco", "cepu", true],
  ["electrical", "Genset Darurat 500 kVA GEN-01", "Cummins", "cepu", true],
  ["electrical", "Genset Darurat 350 kVA GEN-02", "Perkins", "bpn", true],
  ["electrical", "Trafo Distribusi 20 kV TR-01", "Schneider Electric", "bpn", true],
  ["electrical", "Panel Distribusi Utama MDP-2", "Schneider Electric", "cepu", false],
  ["electrical", "UPS Ruang Kontrol UPS-01", "APC", "cepu", true],
  ["lifting", "Mobile Crane 50 Ton MC-01", "Tadano", "bpn", true],
  ["lifting", "Overhead Crane Workshop 10 Ton OC-01", "Demag", "cepu", true],
  ["lifting", "Forklift Diesel 3 Ton FL-01", "Toyota", "bpn", false],
  ["lifting", "Forklift Diesel 3 Ton FL-02", "Toyota", "cepu", false],
  ["lifting", "Chain Block 5 Ton CB-07", "Kito", "cepu", false],
  ["fire", "Fire Water Tank FWT-01 kapasitas 1.000 KL", "PT Barata Indonesia", "bpn", true],
  ["fire", "Foam Bladder Tank FBT-01", "Tyco", "bpn", true],
  ["fire", "Sistem Deteksi Gas Area Wellpad GDS-01", "Honeywell", "cepu", true],
  ["fire", "Sistem Alarm Kebakaran Gedung Kantor FA-01", "Notifier", "hq", true],
  ["fire", "Fire Truck Unit FT-01", "Morita", "bpn", true],
];

// Alat ukur — disemai DUA KALI: sekali sebagai aset (modul 15) dan sekali
// sebagai item kalibrasi (modul 16) yang menunjuk aset itu. Basis data
// memasang batasan unik pada calibration_items.asset_id, jadi hubungannya
// memang satu-ke-satu: satu alat ukur tidak bisa punya dua entri kalibrasi.
// Karena itu jumlah item kalibrasi di sini ditentukan oleh jumlah alat ukur
// yang ada, bukan sebaliknya.
const INSTRUMENTS = [
  ["Pressure Transmitter PT-1042", "Rosemount", "cepu", "Tekanan", "bar", 0, 100, 12, true],
  ["Pressure Transmitter PT-1043", "Rosemount", "cepu", "Tekanan", "bar", 0, 60, 12, true],
  ["Pressure Gauge PG-2011 Manifold", "WIKA", "cepu", "Tekanan", "bar", 0, 40, 12, false],
  ["Pressure Gauge PG-2012 Rumah Pompa", "WIKA", "bpn", "Tekanan", "bar", 0, 25, 12, false],
  ["Flow Meter Custody Transfer FM-201", "Emerson", "bpn", "Laju Alir", "m3/jam", 0, 500, 6, true],
  ["Flow Meter Coriolis FM-202", "Emerson", "bpn", "Laju Alir", "m3/jam", 0, 300, 6, true],
  ["Flow Meter Turbin FM-115", "Faure Herman", "cepu", "Laju Alir", "m3/jam", 0, 200, 12, false],
  ["Level Transmitter LT-101 Tangki T-101", "Endress+Hauser", "bpn", "Ketinggian Cairan", "meter", 0, 18, 12, true],
  ["Level Transmitter LT-104 Tangki T-104", "Endress+Hauser", "bpn", "Ketinggian Cairan", "meter", 0, 14, 12, true],
  ["Level Gauge LG-105 Knock Out Drum", "KSR Kuebler", "cepu", "Ketinggian Cairan", "meter", 0, 3, 24, false],
  ["Gas Detector Portabel GD-05", "Draeger", "cepu", "Konsentrasi H2S", "ppm", 0, 100, 6, true],
  ["Gas Detector Portabel GD-06", "Draeger", "cepu", "Konsentrasi H2S", "ppm", 0, 100, 6, true],
  ["Gas Detector Tetap GD-11 Wellpad A", "Honeywell", "cepu", "Konsentrasi LEL", "persen LEL", 0, 100, 6, true],
  ["Gas Detector Tetap GD-12 Wellpad B", "Honeywell", "cepu", "Konsentrasi LEL", "persen LEL", 0, 100, 6, true],
  ["Temperature Transmitter TT-310", "Yokogawa", "bpn", "Suhu", "derajat Celsius", -20, 400, 12, false],
  ["Temperature Transmitter TT-311", "Yokogawa", "bpn", "Suhu", "derajat Celsius", -20, 250, 12, false],
  ["Termometer Referensi Laboratorium TR-01", "Fluke", "bpn", "Suhu", "derajat Celsius", -30, 300, 12, true],
  ["Timbangan Laboratorium AB-204", "Mettler Toledo", "bpn", "Massa", "gram", 0, 220, 12, true],
  ["Kunci Momen TW-07 Bengkel Mekanik", "Stahlwille", "cepu", "Momen Puntir", "newton meter", 20, 340, 12, false],
  ["Kunci Momen TW-08 Bengkel Mekanik", "Stahlwille", "bpn", "Momen Puntir", "newton meter", 40, 600, 12, false],
  ["Multimeter Digital MM-14", "Fluke", "cepu", "Tegangan Listrik", "volt", 0, 1000, 12, false],
  ["Sound Level Meter SLM-02", "Bruel & Kjaer", "cepu", "Tingkat Kebisingan", "desibel A", 30, 130, 12, true],
  ["Lux Meter LX-03", "Extech", "hq", "Intensitas Cahaya", "lux", 0, 20000, 24, false],
  ["Ultrasonic Thickness Gauge UT-09", "Olympus", "bpn", "Ketebalan Dinding", "milimeter", 1, 300, 12, true],
];

const CONTRACTORS = [
  ["PT Bangun Sarana Migas", "CONSTRUCTION", "TIER_1", "HIGH", "ACTIVE", -900],
  ["PT Karya Teknik Nusantara", "ENGINEERING_SERVICES", "TIER_1", "HIGH", "ACTIVE", -820],
  ["CV Mitra Jasa Teknik", "ENGINEERING_SERVICES", "SUB_CONTRACTOR", "MEDIUM", "ACTIVE", -760],
  ["PT Baja Perkasa Enjiniring", "CONSTRUCTION", "TIER_1", "HIGH", "SUSPENDED", -700],
  ["PT Andalan Logistik Samudra", "LOGISTICS", "TIER_1", "MEDIUM", "ACTIVE", -640],
  ["PT Sumber Tenaga Mandiri", "LABOR_SUPPLY", "SUB_CONTRACTOR", "MEDIUM", "ACTIVE", -580],
  ["PT Boga Rasa Katering", "CATERING", "SUB_CONTRACTOR", "LOW", "ACTIVE", -520],
  ["PT Garda Wibawa Sentosa", "SECURITY", "TIER_1", "LOW", "ACTIVE", -480],
  ["PT Cipta Instrumen Presisi", "ENGINEERING_SERVICES", "TIER_1", "MEDIUM", "PREQUALIFIED", -300],
  ["CV Sinar Las Mandiri", "CONSTRUCTION", "SUB_CONTRACTOR", "HIGH", "PREQUALIFIED", -240],
  ["PT Trans Angkasa Kargo", "LOGISTICS", "SUB_CONTRACTOR", "MEDIUM", "REGISTERED", -90],
  ["PT Prima Konstruksi Abadi", "CONSTRUCTION", "TIER_1", "HIGH", "BLACKLISTED", -1100],
];

async function seedOperations(client, ctx, ref) {
  const random = seededRandom("operations");
  const environmental = actor(ctx, "ENVIRONMENTAL_OFFICER");
  const doctor = actor(ctx, "OCCUPATIONAL_HEALTH_STAFF");
  const hseManager = actor(ctx, "HSE_MANAGER");
  const supervisors = actors(ctx, "SUPERVISOR");
  const siteOf = (key) => ctx.siteIds[key];
  const deptOf = (key) => (key === "cepu" ? ctx.deptIds.ops : key === "bpn" ? ctx.deptIds.mtc : ctx.deptIds.hse);

  // --- Modul 12: aspek dan dampak lingkungan ---
  let aspectSequence = 0;
  for (const [activity, impact, impactType, condition, siteKey, regulated] of ENV_ASPECTS) {
    aspectSequence += 1;
    const number = `EAI/2026/${String(aspectSequence).padStart(3, "0")}`;
    const likelihood = intBetween(random, 1, 5);
    const severity = intBetween(random, 1, 5);
    const frequency = intBetween(random, 1, 5);
    const regulatory = regulated ? intBetween(random, 3, 5) : intBetween(random, 1, 2);
    const stakeholder = intBetween(random, 1, 5);
    // Skor signifikansi = rerata kelima kriteria, ambang 3,0. Rumusnya
    // sederhana dengan sengaja: yang diperlihatkan adalah bahwa angka di
    // kolom "Signifikansi" konsisten dengan angka di kolom "Skor", bukan
    // metodologi penilaian tertentu.
    const score = Number(((likelihood + severity + frequency + regulatory + stakeholder) / 5).toFixed(2));
    await upsert(
      client,
      "environmental_aspects_impacts",
      "aspect_impact_id",
      {
        aspect_impact_id: uuidFor("env-aspect", number),
        register_number: number,
        company_id: ctx.companyId,
        site_id: siteOf(siteKey),
        department_id: deptOf(siteKey),
        activity_process_area: activity,
        environmental_aspect: activity,
        environmental_impact: impact,
        impact_type: impactType,
        condition_type: condition,
        likelihood_score: likelihood,
        severity_score: severity,
        frequency_score: frequency,
        regulatory_score: regulatory,
        stakeholder_concern_score: stakeholder,
        significance_score: score,
        significance_threshold: 3.0,
        significance_level: score >= 3.0 ? "SIGNIFICANT" : "NOT_SIGNIFICANT",
        is_regulated: regulated,
        status: aspectSequence % 9 === 0 ? "UNDER_REVIEW" : "ACTIVE",
        identified_by: environmental.id,
      },
      ctx.audit,
    );
  }

  // --- Modul 13: penilaian kelayakan kerja + penugasan kerja terbatas ---
  let dutySequence = 0;
  for (const [userKey, restrictionType, alternativeTask, siteKey, trigger, fitStatus, startOffset, durationDays] of RESTRICTED_DUTIES) {
    dutySequence += 1;
    const employeeId = ctx.userIds[userKey];
    const assessmentKey = `FTW/${userKey}/${dutySequence}`;
    const assessmentId = await upsert(
      client,
      "fit_to_work_assessments",
      "fit_to_work_assessment_id",
      {
        fit_to_work_assessment_id: uuidFor("fit-to-work", assessmentKey),
        site_id: siteOf(siteKey),
        employee_user_id: employeeId,
        assessment_date: dateOnly(daysAgo(-startOffset + 1)),
        assessment_trigger: trigger,
        assessed_by: doctor.id,
        fit_status: fitStatus,
        restriction_summary: alternativeTask,
        valid_until: dateOnly(daysFromNow(startOffset + durationDays)),
        status: "ACTIVE",
      },
      ctx.audit,
    );

    const start = daysAgo(-startOffset);
    const end = daysFromNow(startOffset + durationDays);
    const finished = end.getTime() < Date.now();

    await upsert(
      client,
      "restricted_duty_assignments",
      "restricted_duty_assignment_id",
      {
        restricted_duty_assignment_id: uuidFor("restricted-duty", assessmentKey),
        site_id: siteOf(siteKey),
        department_id: deptOf(siteKey),
        employee_user_id: employeeId,
        fit_to_work_assessment_id: assessmentId,
        restriction_type: restrictionType,
        alternative_task_description: alternativeTask,
        assigned_by: doctor.id,
        supervisor_user_id: pick(random, supervisors).id,
        start_date: dateOnly(start),
        end_date: dateOnly(end),
        status: finished ? "COMPLETED" : dutySequence === 6 ? "ESCALATED_NON_COMPLIANT" : "ACTIVE",
        compliance_confirmed_by_supervisor: dutySequence % 3 !== 0,
      },
      ctx.audit,
    );
  }

  // --- Modul 15: aset dan peralatan ---
  const LIFECYCLE = ["ACTIVE", "ACTIVE", "ACTIVE", "ACTIVE", "ACTIVE", "UNDER_MAINTENANCE", "STANDBY", "RETIRED"];
  const CONDITION = ["GOOD", "GOOD", "GOOD", "FAIR", "GOOD", "FAIR", "POOR", "OUT_OF_SERVICE"];
  let assetSequence = 0;
  const assetIdByName = {};
  for (const [categoryKey, assetName, manufacturer, siteKey, safetyCritical] of ASSETS) {
    assetSequence += 1;
    const code = `AST-${String(assetSequence).padStart(4, "0")}`;
    const lifecycle = LIFECYCLE[assetSequence % LIFECYCLE.length];
    assetIdByName[assetName] = await upsert(
      client,
      "assets",
      "asset_id",
      {
        asset_id: uuidFor("asset", code),
        asset_code: code,
        asset_name: assetName,
        asset_category_id: ref.assetCategories[categoryKey],
        company_id: ctx.companyId,
        site_id: siteOf(siteKey),
        department_id: deptOf(siteKey),
        manufacturer,
        serial_number: `SN-${String(10000 + assetSequence * 37)}`,
        lifecycle_status: lifecycle,
        condition_status: lifecycle === "RETIRED" ? "OUT_OF_SERVICE" : CONDITION[assetSequence % CONDITION.length],
        is_safety_critical: safetyCritical,
        commissioning_date: dateOnly(daysAgo(intBetween(random, 400, 4000))),
      },
      ctx.audit,
    );
  }

  // --- Modul 15 lanjutan + Modul 16: alat ukur dan item kalibrasinya ---
  let calibrationSequence = 0;
  for (const [assetName, manufacturer, siteKey, parameter, unit, rangeMin, rangeMax, intervalMonths, critical] of INSTRUMENTS) {
    assetSequence += 1;
    calibrationSequence += 1;
    const code = `AST-${String(assetSequence).padStart(4, "0")}`;
    const assetId = await upsert(
      client,
      "assets",
      "asset_id",
      {
        asset_id: uuidFor("asset", code),
        asset_code: code,
        asset_name: assetName,
        asset_category_id: ref.assetCategories.instrument,
        company_id: ctx.companyId,
        site_id: siteOf(siteKey),
        department_id: deptOf(siteKey),
        manufacturer,
        serial_number: `SN-${String(10000 + assetSequence * 37)}`,
        lifecycle_status: "ACTIVE",
        condition_status: calibrationSequence % 8 === 0 ? "FAIR" : "GOOD",
        is_safety_critical: critical,
        commissioning_date: dateOnly(daysAgo(intBetween(random, 400, 3000))),
      },
      ctx.audit,
    );

    const tag = assetName.match(/\b([A-Z]{2,3}-\d{2,4})\b/);
    const status = calibrationSequence % 9 === 0 ? "IN_CALIBRATION" : calibrationSequence % 13 === 0 ? "OUT_OF_SERVICE" : "ACTIVE";
    await upsert(
      client,
      "calibration_items",
      "calibration_item_id",
      {
        calibration_item_id: uuidFor("calibration", code),
        asset_id: assetId,
        company_id: ctx.companyId,
        site_id: siteOf(siteKey),
        department_id: deptOf(siteKey),
        equipment_tag_no: tag ? tag[1] : `CAL-${String(calibrationSequence).padStart(4, "0")}`,
        measurement_parameter: parameter,
        measurement_range_min: rangeMin,
        measurement_range_max: rangeMax,
        measurement_range_unit: unit,
        calibration_interval_months: intervalMonths,
        calibration_status: status,
        is_critical_measurement: critical,
      },
      ctx.audit,
    );
  }

  // --- Modul 17: kontraktor ---
  let contractorSequence = 0;
  for (const [name, type, category, risk, status, registeredOffset] of CONTRACTORS) {
    contractorSequence += 1;
    await upsert(
      client,
      "contractors",
      "contractor_id",
      {
        contractor_id: uuidFor("contractor", name),
        contractor_name: name,
        contractor_type: type,
        contractor_category: category,
        overall_risk_rating: risk,
        status,
        registered_at: dateOnly(daysAgo(-registeredOffset)),
        address: `Jl. Industri Raya No. ${intBetween(random, 5, 199)}, ${pick(random, ["Jakarta Timur", "Cepu", "Balikpapan", "Surabaya", "Bekasi"])}`,
        company_id: ctx.companyId,
      },
      ctx.audit,
    );
  }

  return {
    environmentalAspects: ENV_ASPECTS.length,
    restrictedDuties: RESTRICTED_DUTIES.length,
    assets: assetSequence,
    calibrationItems: calibrationSequence,
    contractors: CONTRACTORS.length,
  };
}

module.exports = { seedOperations };
