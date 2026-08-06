// Definisi workflow persetujuan — DISALIN dari *-workflow-bootstrap.service.ts
// milik apps/api, bukan dikarang ulang.
//
// Nama tahap, kode peran approver, jam SLA, dan kondisi percabangan JSON Logic
// di bawah ini semuanya diambil apa adanya dari berkas bootstrap masing-masing
// modul. Itu penting: alur persetujuan adalah bagian yang paling sering
// diperdebatkan saat implementasi ISO 45001, dan alur yang "kira-kira mirip"
// akan menyesatkan justru pada rapat di mana ketelitiannya paling diperiksa.
//
// Rujukan per modul:
//   izin kerja        work-permit-workflow-bootstrap.service.ts
//   dokumen           dms-bootstrap.service.ts
//   HIRA              risk-workflow-bootstrap.service.ts
//   insiden           incident-workflow-bootstrap.service.ts
//   CAPA              capa-workflow-bootstrap.service.ts
//   audit             audit-workflow-bootstrap.service.ts
//   NCR mutu          quality-workflow-bootstrap.service.ts
//   aspek lingkungan  environmental-workflow-bootstrap.service.ts
//   tanggap darurat   emergency-response-workflow-bootstrap.service.ts
//   kontraktor        contractor-workflow-bootstrap.service.ts
//
// SATU PENYIMPANGAN YANG DISENGAJA. Dua tahap di apps/api memakai
// approverType CONTEXT_USER — "Review Document Owner" (dokumen) dan "Review
// Lead Auditor" (laporan audit) — yaitu approver yang MENGIKUTI entitasnya,
// dibaca dari context_data.contextUserId. Keduanya dipertahankan di sini, dan
// pemanggilnya (server.js) wajib mengisi contextUserId dari pemilik dokumen /
// ketua auditor baris yang bersangkutan. Kalau kosong, mesin melempar galat
// eksplisit alih-alih diam-diam menugaskan orang yang salah.
const { uuidFor, upsert } = require("./lib");

const DEFINITIONS = [
  {
    key: "work_permit",
    moduleCode: "WORK_PERMIT",
    name: "Work Permit — 1/2 Level (Review Issuer/Area Authority -> [kondisional] Approval HSE)",
    stages: [
      { key: "issuer", name: "Review Issuer/Area Authority", roleCode: "SUPERVISOR", slaHours: 2 },
      { key: "hse", name: "Approval HSE (risiko HIGH/tipe wajib HSE)", roleCode: "HSE_MANAGER", slaHours: 4 },
    ],
    // Percabangan BR-04: tahap HSE hanya dilalui kalau risikonya HIGH atau
    // tipe izinnya memang mewajibkan persetujuan HSE. Nilai `hasHseStage`
    // dihitung pemanggil SEBELUM instance dimulai — mesin workflow tidak
    // pernah membaca data domain sendiri.
    transitions: [
      { from: "issuer", to: "hse", action: "APPROVE", condition: { "==": [{ var: "hasHseStage" }, true] }, priority: 0 },
      { from: "issuer", to: null, action: "APPROVE", result: "APPROVED", priority: 1 },
      { from: "issuer", to: null, action: "REJECT", result: "REJECTED", priority: 0 },
      { from: "hse", to: null, action: "APPROVE", result: "APPROVED", priority: 0 },
      { from: "hse", to: null, action: "REJECT", result: "REJECTED", priority: 0 },
    ],
  },
  {
    key: "document",
    moduleCode: "DMS",
    name: "Document Version Approval — 2 Stage (Review Document Owner -> Approval HSE Manager)",
    stages: [
      { key: "owner", name: "Review Document Owner", approverType: "CONTEXT_USER", slaHours: 72 },
      { key: "hse", name: "Approval HSE Manager", roleCode: "HSE_MANAGER", slaHours: 72 },
    ],
    transitions: linear(["owner", "hse"]),
  },
  {
    key: "hira",
    moduleCode: "RISK",
    name: "HIRA — 2/3 Level (Review Supervisor -> Approval HSE Manager -> [kondisional] Approval Company HSE Head)",
    stages: [
      { key: "supervisor", name: "Review Supervisor", roleCode: "SUPERVISOR", slaHours: 72 },
      { key: "hse", name: "Approval HSE Manager", roleCode: "HSE_MANAGER", slaHours: 72 },
      { key: "company", name: "Approval Company HSE Head (risiko EXTREME)", roleCode: "COMPANY_ADMIN", slaHours: 72 },
    ],
    // Tahap ketiga hanya dilalui kalau ada bahaya berisiko ekstrem pada
    // penilaian itu — dihitung pemanggil dari hira_hazard_lines.
    transitions: [
      { from: "supervisor", to: "hse", action: "APPROVE", priority: 0 },
      { from: "supervisor", to: null, action: "REJECT", result: "REJECTED", priority: 0 },
      { from: "hse", to: "company", action: "APPROVE", condition: { "==": [{ var: "hasExtremeHazard" }, true] }, priority: 0 },
      { from: "hse", to: null, action: "APPROVE", result: "APPROVED", priority: 1 },
      { from: "hse", to: null, action: "REJECT", result: "REJECTED", priority: 0 },
      { from: "company", to: null, action: "APPROVE", result: "APPROVED", priority: 0 },
      { from: "company", to: null, action: "REJECT", result: "REJECTED", priority: 0 },
    ],
  },
  {
    key: "incident",
    moduleCode: "INCIDENT",
    name: "Incident Investigation Review -> [kondisional] Persetujuan Pelaporan Regulator",
    stages: [
      { key: "review", name: "Review Laporan Investigasi", roleCode: "HSE_MANAGER", slaHours: 72 },
      { key: "regulator", name: "Persetujuan Pelaporan Regulator", roleCode: "COMPANY_ADMIN", slaHours: 48 },
    ],
    transitions: [
      { from: "review", to: "regulator", action: "APPROVE", condition: { "==": [{ var: "hasRegulatoryReport" }, true] }, priority: 0 },
      { from: "review", to: null, action: "APPROVE", result: "APPROVED", priority: 1 },
      { from: "review", to: null, action: "REJECT", result: "REJECTED", priority: 0 },
      { from: "regulator", to: null, action: "APPROVE", result: "APPROVED", priority: 0 },
      { from: "regulator", to: null, action: "REJECT", result: "REJECTED", priority: 0 },
    ],
  },
  {
    key: "capa",
    moduleCode: "CAPA_ACTION_PLAN",
    name: "CAPA Action Plan Approval — 1 Stage (HSE/QMS Manager)",
    stages: [{ key: "hse", name: "Approval Rencana Tindakan (HSE/QMS Manager)", roleCode: "HSE_MANAGER", slaHours: 72 }],
    transitions: linear(["hse"]),
  },
  {
    key: "audit",
    moduleCode: "AUDIT_REPORT",
    name: "Audit Report Approval — 2 Stage (Review Lead Auditor -> Approval HSE/QMS Manager)",
    stages: [
      { key: "lead", name: "Review Lead Auditor", approverType: "CONTEXT_USER", slaHours: 72 },
      { key: "hse", name: "Approval HSE/QMS Manager", roleCode: "HSE_MANAGER", slaHours: 72 },
    ],
    transitions: linear(["lead", "hse"]),
  },
  {
    key: "ncr",
    moduleCode: "QUALITY_NCR",
    name: "NCR Disposition & Closure — 3 Stage",
    stages: [
      { key: "supervisor", name: "Review Supervisor", roleCode: "SUPERVISOR", slaHours: 24 },
      { key: "disposition", name: "Approval Disposisi Quality Manager", roleCode: "QUALITY_MANAGER", slaHours: 48 },
      { key: "closure", name: "Verifikasi Penutupan", roleCode: "QUALITY_MANAGER", slaHours: 24 },
    ],
    transitions: linear(["supervisor", "disposition", "closure"]),
  },
  {
    key: "env_aspect",
    moduleCode: "ENV_ASPECT_REVIEW",
    name: "Environmental Aspect-Impact Review & Approval — 2 Stage",
    stages: [
      { key: "officer", name: "Review Environmental Officer", roleCode: "ENVIRONMENTAL_OFFICER", slaHours: 120 },
      { key: "hse", name: "Approval HSE Manager", roleCode: "HSE_MANAGER", slaHours: 120 },
    ],
    transitions: linear(["officer", "hse"]),
  },
  {
    key: "emergency_plan",
    moduleCode: "EMERGENCY_PLAN",
    name: "Emergency Response Plan Review -> [kondisional] Approval Level Tinggi",
    stages: [
      { key: "review", name: "Review HSE Manager", roleCode: "HSE_MANAGER", slaHours: 120 },
      { key: "top", name: "Approval Level Tinggi (Top Management/Site Manager)", roleCode: "COMPANY_ADMIN", slaHours: 120 },
    ],
    transitions: [
      { from: "review", to: "top", action: "APPROVE", condition: { "!=": [{ var: "severityLevel" }, "LEVEL_1_LOCAL"] }, priority: 0 },
      { from: "review", to: null, action: "APPROVE", result: "APPROVED", priority: 1 },
      { from: "review", to: null, action: "REJECT", result: "REJECTED", priority: 0 },
      { from: "top", to: null, action: "APPROVE", result: "APPROVED", priority: 0 },
      { from: "top", to: null, action: "REJECT", result: "REJECTED", priority: 0 },
    ],
  },
  {
    key: "contractor_pq",
    moduleCode: "CONTRACTOR_PREQUALIFICATION",
    name: "Contractor Prequalification Review & Approval — 2 Stage",
    stages: [
      { key: "coordinator", name: "Review Contractor Coordinator", roleCode: "HSE_OFFICER", slaHours: 120 },
      { key: "hse", name: "Approval HSE Manager", roleCode: "HSE_MANAGER", slaHours: 120 },
    ],
    transitions: linear(["coordinator", "hse"]),
  },
  {
    key: "inspection",
    moduleCode: "QUALITY_INSPECTION_DEVIATION",
    name: "Inspection Record Verification — 1 Stage (HSE Manager)",
    stages: [{ key: "hse", name: "Verifikasi Hasil Inspeksi (HSE Manager)", roleCode: "HSE_MANAGER", slaHours: 48 }],
    transitions: linear(["hse"]),
  },
];

/** Rantai lurus: setiap tahap menyetujui lalu maju; tahap terakhir menutup
 *  instance sebagai APPROVED. Penolakan di tahap mana pun bersifat terminal. */
function linear(stageKeys) {
  const transitions = [];
  stageKeys.forEach((key, index) => {
    const isLast = index === stageKeys.length - 1;
    transitions.push(
      isLast
        ? { from: key, to: null, action: "APPROVE", result: "APPROVED", priority: 0 }
        : { from: key, to: stageKeys[index + 1], action: "APPROVE", priority: 0 },
    );
    transitions.push({ from: key, to: null, action: "REJECT", result: "REJECTED", priority: 0 });
  });
  return transitions;
}

async function seedWorkflows(client, ctx) {
  let definitionCount = 0;
  let stageCount = 0;
  let transitionCount = 0;

  for (const definition of DEFINITIONS) {
    const definitionId = uuidFor("workflow_definition", definition.key);
    await upsert(
      client,
      "workflow_definitions",
      "workflow_definition_id",
      {
        workflow_definition_id: definitionId,
        module_code: definition.moduleCode,
        name: definition.name,
        is_active: true,
        version: 1,
      },
      ctx.audit,
    );
    definitionCount++;

    const stageIds = {};
    for (const [index, stage] of definition.stages.entries()) {
      const stageId = uuidFor("workflow_stage", `${definition.key}:${stage.key}`);
      stageIds[stage.key] = stageId;
      const approverType = stage.approverType || "ROLE_IN_SCOPE";
      if (approverType === "ROLE_IN_SCOPE" && !ctx.roleIds[stage.roleCode]) {
        throw new Error(
          `Peran "${stage.roleCode}" untuk tahap "${stage.name}" belum ada di tenant ini. ` +
            `Tahap tanpa pemegang peran akan menghentikan setiap pengajuan dengan "tidak ada approver".`,
        );
      }
      await upsert(
        client,
        "workflow_stages",
        "stage_id",
        {
          stage_id: stageId,
          workflow_definition_id: definitionId,
          sequence_no: index + 1,
          stage_name: stage.name,
          approver_type: approverType,
          approver_role_id: approverType === "ROLE_IN_SCOPE" ? ctx.roleIds[stage.roleCode] : null,
          approver_user_id: null,
          sla_hours: stage.slaHours,
          escalation_action: "NOTIFY_SUPERIOR",
          allow_delegation: true,
          // Tahap berbasis PERAN menghasilkan satu tugas untuk SETIAP pemegang
          // peran itu, dan aturan penyelesaiannya ANY_ONE_APPROVE: cukup satu
          // yang menandatangani.
          //
          // Ini penyimpangan sadar dari bawaan ALL_APPROVE di apps/api, dan
          // alasannya ada pada keterbatasan yang diakui apps/api sendiri:
          // ApproverResolutionService masih menyelesaikan ROLE_IN_SCOPE secara
          // TENANT-WIDE (banner comment-nya menyebut penyempitan ke scope
          // entity ditunda sampai ada pemanggil nyata). Digabung dengan
          // ALL_APPROVE, artinya sebuah izin kerja di Cepu baru sah setelah
          // supervisor Balikpapan ikut menandatanganinya — yang bukan hanya
          // merepotkan, tapi keliru: tahap "Review Issuer/Area Authority"
          // berarti SEORANG issuer yang berwenang menandatangani, bukan semua
          // issuer di perusahaan.
          //
          // Kalau penyempitan scope itu kelak diimplementasikan, tahap ini
          // akan menghasilkan satu tugas saja dan aturannya tidak lagi
          // berpengaruh — jadi keputusan ini tidak menghalangi perbaikan itu.
          is_parallel_group: approverType === "ROLE_IN_SCOPE",
          parallel_completion_rule: approverType === "ROLE_IN_SCOPE" ? "ANY_ONE_APPROVE" : null,
        },
        ctx.audit,
      );
      stageCount++;
    }

    for (const [index, transition] of definition.transitions.entries()) {
      await upsert(
        client,
        "workflow_transitions",
        "transition_id",
        {
          transition_id: uuidFor("workflow_transition", `${definition.key}:${index}`),
          workflow_definition_id: definitionId,
          from_stage_id: stageIds[transition.from],
          to_stage_id: transition.to ? stageIds[transition.to] : null,
          trigger_action: transition.action,
          condition: transition.condition ? JSON.stringify(transition.condition) : null,
          priority: transition.priority,
          result_status: transition.result || null,
        },
        ctx.audit,
      );
      transitionCount++;
    }
  }

  return { workflowDefinitions: definitionCount, workflowStages: stageCount, workflowTransitions: transitionCount };
}

/** Dipakai server.js untuk menemukan definisi yang berlaku bagi sebuah modul. */
const DEFINITION_KEY_BY_ENTITY = {
  work_permit: "work_permit",
  document: "document",
  hira_assessment: "hira",
  incident_report: "incident",
  capa_register: "capa",
  audit: "audit",
  ncr_record: "ncr",
  environmental_aspect_impact: "env_aspect",
  emergency_response_plan: "emergency_plan",
  contractor: "contractor_pq",
  inspection_record: "inspection",
};

function definitionIdForEntity(entityType) {
  const key = DEFINITION_KEY_BY_ENTITY[entityType];
  return key ? uuidFor("workflow_definition", key) : null;
}

module.exports = { seedWorkflows, DEFINITIONS, definitionIdForEntity, DEFINITION_KEY_BY_ENTITY };
