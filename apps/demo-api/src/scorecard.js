// Balanced Scorecard — dibangun DI ATAS quality_objectives, bukan di sebelahnya.
//
// Sasaran mutu ISO 9001 klausul 6.2 sudah memuat persis yang dibutuhkan sebuah
// KPI scorecard: metrik, target, baseline, capaian berjalan, satuan, pemilik,
// dan periode. Yang ditambahkan migrasi 20260803120000 hanya dua: perspektif
// mana KPI itu berada, dan berapa bobotnya di dalam perspektif itu.

const PERSPECTIVES = [
  {
    code: "FINANCIAL",
    title: "Keuangan",
    caption: "Biaya kerugian, denda, dan penghematan yang lahir dari kinerja QHSE.",
  },
  {
    code: "CUSTOMER",
    title: "Pelanggan & Pemangku Kepentingan",
    caption: "Kepuasan pelanggan, keluhan, dan kepatuhan yang dilihat pihak luar.",
  },
  {
    code: "INTERNAL_PROCESS",
    title: "Proses Internal",
    caption: "Mutu pelaksanaan operasi: insiden, temuan, CAPA, izin kerja, inspeksi.",
  },
  {
    code: "LEARNING_GROWTH",
    title: "Pembelajaran & Pertumbuhan",
    caption: "Kompetensi, pelatihan, budaya lapor, dan kesiapan organisasi.",
  },
];

const PERSPECTIVE_BY_CODE = new Map(PERSPECTIVES.map((p) => [p.code, p]));

/**
 * Arah "baik" sebuah KPI TIDAK ada di skema, jadi disimpulkan dari hubungan
 * target terhadap baseline: target di BAWAH baseline berarti yang dikejar
 * adalah penurunan (angka insiden, hari kerja hilang, biaya kerugian),
 * sedangkan target di ATAS baseline berarti kenaikan (tingkat penutupan CAPA,
 * jam pelatihan).
 *
 * Kalau baseline kosong, diasumsikan makin tinggi makin baik. Asumsi ini
 * DINYATAKAN pada hasilnya lewat `direction`, supaya layar bisa
 * menampilkannya dan pembaca tahu dasar perhitungan capaiannya — bukan
 * menebak-nebak kenapa 40% dari target 25 dihitung sebagai capaian 62%.
 */
function directionOf(targetValue, baselineValue) {
  if (baselineValue === null || baselineValue === undefined) return "HIGHER_IS_BETTER";
  return Number(targetValue) < Number(baselineValue) ? "LOWER_IS_BETTER" : "HIGHER_IS_BETTER";
}

/**
 * Capaian dalam persen terhadap target.
 *
 * Untuk KPI yang mengejar penurunan, rumusnya dibalik (target/capaian), supaya
 * "target 5 insiden, tercapai 3" terbaca 167% dan bukan 60%. Membalik rumus
 * jauh lebih jujur daripada memakai satu rumus untuk keduanya lalu
 * menjelaskannya di catatan kaki yang tidak dibaca siapa pun.
 */
function attainmentPercent(currentValue, targetValue, direction) {
  const current = Number(currentValue);
  const target = Number(targetValue);
  if (!Number.isFinite(current) || !Number.isFinite(target)) return null;

  if (direction === "LOWER_IS_BETTER") {
    // Target nol adalah kasus yang benar-benar terjadi (nol kecelakaan fatal),
    // dan pembagian dengan nol tidak boleh menghasilkan Infinity di layar.
    if (target === 0) return current === 0 ? 100 : 0;
    if (current === 0) return 100;
    return (target / current) * 100;
  }
  if (target === 0) return current === 0 ? 100 : 100;
  return (current / target) * 100;
}

/**
 * Sumbangan sebuah KPI ke skor DIBATASI 100, sementara capaian aslinya tetap
 * ditampilkan apa adanya. Tanpa batas itu, satu KPI yang melesat 300% bisa
 * menutupi dua KPI lain yang gagal total, dan perspektifnya tetap terlihat
 * hijau — kebalikan dari gunanya sebuah scorecard.
 */
function cappedScore(percent) {
  if (percent === null) return null;
  return Math.max(0, Math.min(100, percent));
}

const SELECT_OBJECTIVES = `
  SELECT o.quality_objective_id      AS id,
         o.objective_code            AS "objectiveCode",
         o.objective_title           AS "objectiveTitle",
         o.description,
         o.iso_clause_ref            AS "isoClauseRef",
         o.kpi_metric_name           AS "kpiMetricName",
         o.target_value              AS "targetValue",
         o.target_unit               AS "targetUnit",
         o.baseline_value            AS "baselineValue",
         o.current_value             AS "currentValue",
         o.measurement_frequency     AS "measurementFrequency",
         o.period_start              AS "periodStart",
         o.period_end                AS "periodEnd",
         o.status,
         o.bsc_perspective           AS "bscPerspective",
         o.bsc_weight_percentage     AS "bscWeightPercentage",
         u.full_name                 AS "ownerLabel"
    FROM quality_objectives o
    LEFT JOIN users u ON u.user_id = o.owner_user_id AND u.tenant_id = o.tenant_id
   WHERE o.tenant_id = $1 AND o.deleted_at IS NULL
   ORDER BY o.bsc_perspective NULLS LAST, o.objective_code`;

const SELECT_PROGRESS = `
  SELECT quality_objective_id AS "objectiveId",
         period_label         AS label,
         actual_value         AS value
    FROM quality_objective_progress_logs
   WHERE tenant_id = $1 AND deleted_at IS NULL
   ORDER BY period_label ASC`;

async function loadScorecard(client, tenantId) {
  const [objectives, progress] = await Promise.all([
    client.query(SELECT_OBJECTIVES, [tenantId]).then((r) => r.rows),
    client.query(SELECT_PROGRESS, [tenantId]).then((r) => r.rows),
  ]);

  const trendByObjective = new Map();
  for (const row of progress) {
    if (!trendByObjective.has(row.objectiveId)) trendByObjective.set(row.objectiveId, []);
    trendByObjective.get(row.objectiveId).push({ label: row.label, value: Number(row.value) });
  }

  const decorated = objectives.map((row) => {
    const direction = directionOf(row.targetValue, row.baselineValue);
    const percent = attainmentPercent(row.currentValue, row.targetValue, direction);
    return {
      ...row,
      targetValue: row.targetValue === null ? null : Number(row.targetValue),
      baselineValue: row.baselineValue === null ? null : Number(row.baselineValue),
      currentValue: row.currentValue === null ? null : Number(row.currentValue),
      weight: row.bscWeightPercentage === null ? null : Number(row.bscWeightPercentage),
      direction,
      attainmentPercent: percent,
      score: cappedScore(percent),
      trend: trendByObjective.get(row.id) || [],
    };
  });

  const perspectives = PERSPECTIVES.map((perspective) => {
    const items = decorated.filter((row) => row.bscPerspective === perspective.code);
    return { ...perspective, objectives: items, score: weightedScore(items), weightTotal: weightSum(items) };
  });

  // Sasaran tanpa perspektif ditampilkan TERPISAH, tidak dibuang dan tidak
  // dimasukkan diam-diam ke salah satu kuadran. Sasaran yang belum dipetakan
  // adalah pekerjaan yang belum selesai, dan menyembunyikannya membuat
  // scorecard terlihat lengkap padahal tidak.
  const unmapped = decorated.filter((row) => !row.bscPerspective);

  // Skor total = rata-rata skor perspektif yang PUNYA isi. Bukan rata-rata
  // seluruh KPI: kalau satu perspektif memuat 9 KPI dan tiga lainnya masing-
  // masing 2, rata-rata polos membuat perspektif gemuk itu praktis menentukan
  // sendiri skor perusahaan.
  const scored = perspectives.filter((p) => p.score !== null);
  const totalScore = scored.length ? scored.reduce((sum, p) => sum + p.score, 0) / scored.length : null;

  return { perspectives, unmapped, totalScore, objectiveCount: decorated.length };
}

function weightSum(items) {
  return items.reduce((sum, row) => sum + (row.weight ?? 0), 0);
}

/**
 * KPI tanpa bobot diberi bobot sama rata terhadap sisa yang belum terpakai —
 * bukan diperlakukan sebagai bobot nol. Bobot nol berarti KPI itu tidak ikut
 * menentukan skor sama sekali, dan sebuah KPI yang sengaja dicatat lalu
 * diam-diam tidak dihitung adalah cara paling halus untuk membuat skor
 * terlihat lebih baik daripada kenyataannya.
 */
function weightedScore(items) {
  const scorable = items.filter((row) => row.score !== null);
  if (!scorable.length) return null;

  const declared = scorable.filter((row) => row.weight !== null && row.weight > 0);
  const undeclared = scorable.filter((row) => row.weight === null || row.weight <= 0);
  const declaredTotal = declared.reduce((sum, row) => sum + row.weight, 0);
  const remaining = Math.max(0, 100 - declaredTotal);
  const shareForUndeclared = undeclared.length ? remaining / undeclared.length : 0;

  let weighted = 0;
  let weightTotal = 0;
  for (const row of scorable) {
    const weight = row.weight !== null && row.weight > 0 ? row.weight : shareForUndeclared;
    // Semua bobot nol (mis. bobot terdeklarasi sudah 100 tapi ada KPI lain
    // tanpa bobot) -> jatuh kembali ke rata-rata polos daripada membagi nol.
    weighted += row.score * weight;
    weightTotal += weight;
  }
  if (weightTotal === 0) {
    return scorable.reduce((sum, row) => sum + row.score, 0) / scorable.length;
  }
  return weighted / weightTotal;
}

module.exports = { PERSPECTIVES, PERSPECTIVE_BY_CODE, loadScorecard, directionOf, attainmentPercent };
