// Fondasi data demo — tenant, struktur organisasi, dan pemakainya.
//
// Perusahaannya sama dengan yang dipakai penyemai lengkap di
// apps/api/prisma/demo-seed dan dijelaskan di docs/demo/DEMO_GUIDE.md:
// PT Petro Nusantara Sejahtera, operator migas fiktif dengan kantor pusat di
// Jakarta serta dua lokasi lapangan, Cepu dan Balikpapan. Nama, jabatan, dan
// alamat surel orangnya juga dipertahankan sama, supaya panduan demo yang
// sudah ada tetap cocok dengan apa yang muncul di layar.
//
// Tenant-nya punya UUID tetap (diturunkan dari kodenya), bukan acak seperti
// pada penyemai lengkap. Itu disengaja: apps/web membakar
// NEXT_PUBLIC_DEFAULT_TENANT_ID saat build, jadi tenant yang berganti id
// setiap kali disemai berarti web harus dibangun ulang setiap kali juga —
// dan kolom Tenant ID di halaman masuk akan terisi nilai yang sudah basi.
const { uuidFor, upsert, dateOnly } = require("./lib");
const { hashPassword } = require("../password");

const DEMO_PASSWORD = "Demo!QHSE2026";
const TENANT_CODE = "PETRONS-DEMO";
const TENANT_ID = uuidFor("tenant", TENANT_CODE);

const SITES = [
  { key: "hq", code: "SITE-JKT", name: "Kantor Pusat Jakarta", branchKey: "hq", category: "OFFICE", timezone: "Asia/Jakarta" },
  { key: "cepu", code: "SITE-CEPU", name: "Lapangan Produksi Cepu", branchKey: "cepu", category: "PLANT_FACTORY", timezone: "Asia/Jakarta", geoLat: -7.15, geoLong: 111.5833 },
  { key: "bpn", code: "SITE-BPN", name: "Terminal & Kilang Balikpapan", branchKey: "bpn", category: "PLANT_FACTORY", timezone: "Asia/Makassar", geoLat: -1.2379, geoLong: 116.8529 },
];

const BRANCHES = [
  { key: "hq", code: "HO-JKT", name: "Kantor Pusat Jakarta", type: "HEAD_OFFICE" },
  { key: "cepu", code: "BR-CEPU", name: "Cabang Operasi Cepu", type: "REGIONAL_OFFICE" },
  { key: "bpn", code: "BR-BPN", name: "Cabang Operasi Balikpapan", type: "REGIONAL_OFFICE" },
];

const DEPARTMENTS = [
  { key: "hse", code: "DEPT-HSE", name: "HSE & Quality", type: "HSE", siteKey: "hq" },
  { key: "ops", code: "DEPT-OPS", name: "Operasi Produksi", type: "OPERATIONAL", siteKey: "cepu" },
  { key: "mtc", code: "DEPT-MTC", name: "Maintenance & Reliability", type: "MAINTENANCE", siteKey: "bpn" },
];

// Peran di kolom `roleCode` TIDAK ditulis ke tabel user_roles di sini —
// demo-api tidak menegakkan RBAC (lihat banner comment server.js), jadi
// baris peran tanpa mesin izin yang membacanya hanya akan menyesatkan
// pembaca basis data. Kolomnya tetap ada karena berkas penyemai modul
// memakainya untuk memilih pelaku yang masuk akal: yang menandatangani izin
// kerja panas adalah supervisor, bukan dokter perusahaan.
const USERS = [
  { key: "budi", email: "budi.santoso@petro-ns.demo", fullName: "Budi Santoso", jobTitle: "Tenant Administrator", roleCode: "TENANT_ADMIN", siteKey: "hq", deptKey: "hse", employeeId: "PNS-0001" },
  { key: "siti", email: "siti.rahayu@petro-ns.demo", fullName: "Siti Rahayu", jobTitle: "Company Administrator", roleCode: "COMPANY_ADMIN", siteKey: "hq", deptKey: "hse", employeeId: "PNS-0002" },
  { key: "andi", email: "andi.wijaya@petro-ns.demo", fullName: "Andi Wijaya", jobTitle: "HSE Manager", roleCode: "HSE_MANAGER", siteKey: "hq", deptKey: "hse", employeeId: "PNS-0003" },
  { key: "dewi", email: "dewi.lestari@petro-ns.demo", fullName: "Dewi Lestari", jobTitle: "HSE Officer — Site Cepu", roleCode: "HSE_OFFICER", siteKey: "cepu", deptKey: "ops", employeeId: "PNS-0004" },
  { key: "rudi", email: "rudi.hartono@petro-ns.demo", fullName: "Rudi Hartono", jobTitle: "HSE Officer — Site Balikpapan", roleCode: "HSE_OFFICER", siteKey: "bpn", deptKey: "mtc", employeeId: "PNS-0005" },
  { key: "agus", email: "agus.setiawan@petro-ns.demo", fullName: "Agus Setiawan", jobTitle: "Kepala Departemen Operasi", roleCode: "DEPARTMENT_HEAD", siteKey: "cepu", deptKey: "ops", employeeId: "PNS-0006" },
  { key: "hendra", email: "hendra.kusuma@petro-ns.demo", fullName: "Hendra Kusuma", jobTitle: "Supervisor Produksi — Cepu", roleCode: "SUPERVISOR", siteKey: "cepu", deptKey: "ops", employeeId: "PNS-0007" },
  { key: "yusuf", email: "yusuf.pratama@petro-ns.demo", fullName: "Yusuf Pratama", jobTitle: "Supervisor Terminal — Balikpapan", roleCode: "SUPERVISOR", siteKey: "bpn", deptKey: "mtc", employeeId: "PNS-0008" },
  { key: "maria", email: "maria.simanjuntak@petro-ns.demo", fullName: "Maria Simanjuntak", jobTitle: "Internal Auditor", roleCode: "AUDITOR_INTERNAL", siteKey: "hq", deptKey: "hse", employeeId: "PNS-0009" },
  { key: "robert", email: "robert.tanjung@auditor-eksternal.demo", fullName: "Robert Tanjung", jobTitle: "Auditor Eksternal — Lembaga Sertifikasi", roleCode: "AUDITOR_EXTERNAL", siteKey: "hq", userType: "CONTRACTOR" },
  { key: "joko", email: "joko.susilo@petro-ns.demo", fullName: "Joko Susilo", jobTitle: "Operator Produksi", roleCode: "WORKER_EMPLOYEE", siteKey: "cepu", deptKey: "ops", employeeId: "PNS-0011" },
  { key: "bambang", email: "bambang.suryadi@petro-ns.demo", fullName: "Bambang Suryadi", jobTitle: "Teknisi Mekanik", roleCode: "WORKER_EMPLOYEE", siteKey: "cepu", deptKey: "ops", employeeId: "PNS-0012" },
  { key: "fitri", email: "fitri.handayani@petro-ns.demo", fullName: "Fitri Handayani", jobTitle: "Operator Terminal", roleCode: "WORKER_EMPLOYEE", siteKey: "bpn", deptKey: "mtc", employeeId: "PNS-0013" },
  { key: "eko", email: "eko.prasetyo@petro-ns.demo", fullName: "Eko Prasetyo", jobTitle: "Teknisi Instrumentasi", roleCode: "WORKER_EMPLOYEE", siteKey: "bpn", deptKey: "mtc", employeeId: "PNS-0014" },
  { key: "ahmad", email: "ahmad.fauzi@kontraktor-mitra.demo", fullName: "Ahmad Fauzi", jobTitle: "PIC Kontraktor — CV Mitra Jasa Teknik", roleCode: "CONTRACTOR_USER", siteKey: "cepu", userType: "CONTRACTOR" },
  { key: "ratna", email: "ratna.sari@petro-ns.demo", fullName: "dr. Ratna Sari", jobTitle: "Dokter Perusahaan / Occupational Health", roleCode: "OCCUPATIONAL_HEALTH_STAFF", siteKey: "hq", deptKey: "hse", employeeId: "PNS-0016" },
  { key: "nina", email: "nina.puspita@petro-ns.demo", fullName: "Nina Puspita", jobTitle: "Document Controller", roleCode: "DOCUMENT_CONTROLLER", siteKey: "hq", deptKey: "hse", employeeId: "PNS-0017" },
  { key: "iwan", email: "iwan.setiabudi@petro-ns.demo", fullName: "Iwan Setiabudi", jobTitle: "Compliance Officer", roleCode: "COMPLIANCE_OFFICER", siteKey: "hq", deptKey: "hse", employeeId: "PNS-0018" },
  { key: "lina", email: "lina.marlina@petro-ns.demo", fullName: "Lina Marlina", jobTitle: "Quality Manager", roleCode: "QUALITY_MANAGER", siteKey: "hq", deptKey: "hse", employeeId: "PNS-0019" },
  { key: "dedi", email: "dedi.kurniawan@petro-ns.demo", fullName: "Dedi Kurniawan", jobTitle: "QC Inspector", roleCode: "QC_INSPECTOR", siteKey: "cepu", deptKey: "ops", employeeId: "PNS-0020" },
  { key: "wahyu", email: "wahyu.nugroho@petro-ns.demo", fullName: "Wahyu Nugroho", jobTitle: "Environmental Officer", roleCode: "ENVIRONMENTAL_OFFICER", siteKey: "cepu", deptKey: "ops", employeeId: "PNS-0021" },
  { key: "yanto", email: "yanto.gunawan@petro-ns.demo", fullName: "Yanto Gunawan", jobTitle: "TPS LB3 Officer", roleCode: "TPS_LB3_OFFICER", siteKey: "bpn", deptKey: "mtc", employeeId: "PNS-0022" },
];

async function seedFoundation(client) {
  const companyId = uuidFor("company", "PETRONS-HO");
  const budiId = uuidFor("user", "budi");

  // Tenant lebih dulu, tanpa created_by: kolom itu FK ke users, dan usernya
  // belum ada. Diisi belakangan setelah Budi dibuat.
  await upsert(client, "tenants", "tenant_id", {
    tenant_id: TENANT_ID,
    tenant_code: TENANT_CODE,
    legal_name: "PT Petro Nusantara Sejahtera",
    display_name: "Petro Nusantara Sejahtera",
    tax_id: "01.234.567.8-901.000",
    primary_domain: "petro-ns.demo",
    default_timezone: "Asia/Jakarta",
    default_language: "ID",
    status: "ACTIVE",
    activated_at: new Date("2024-01-15T00:00:00Z"),
  });

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const siteIds = {};
  const branchIds = {};
  const deptIds = {};
  for (const branch of BRANCHES) branchIds[branch.key] = uuidFor("branch", branch.code);
  for (const site of SITES) siteIds[site.key] = uuidFor("site", site.code);
  for (const department of DEPARTMENTS) deptIds[department.key] = uuidFor("department", department.code);

  const userIds = {};
  for (const user of USERS) userIds[user.key] = uuidFor("user", user.key);

  const audit = { tenant_id: TENANT_ID, created_by: budiId, updated_by: budiId };

  // Pengguna disemai sebelum organisasi karena company/branch/site/department
  // semuanya punya created_by NOT NULL yang mengacu ke users.
  for (const user of USERS) {
    await upsert(client, "users", "user_id", {
      user_id: userIds[user.key],
      tenant_id: TENANT_ID,
      email: user.email,
      full_name: user.fullName,
      job_title: user.jobTitle,
      employee_id: user.employeeId,
      user_type: user.userType || "INTERNAL_EMPLOYEE",
      status: "ACTIVE",
      activated_at: new Date("2024-02-01T00:00:00Z"),
      password_hash: passwordHash,
      preferred_language: "ID",
      created_by: budiId,
      updated_by: budiId,
    });
  }

  await upsert(client, "companies", "company_id", {
    company_id: companyId,
    company_code: "PETRONS-HO",
    legal_name: "PT Petro Nusantara Sejahtera",
    display_name: "Petro Nusantara Sejahtera",
    business_registration_no: "AHU-0012345.AH.01.01.2010",
    tax_id: "01.234.567.8-901.000",
    effective_date: "2010-03-15",
    status: "ACTIVE",
    ...audit,
  });

  for (const branch of BRANCHES) {
    await upsert(client, "branches", "branch_id", {
      branch_id: branchIds[branch.key],
      company_id: companyId,
      branch_code: branch.code,
      name: branch.name,
      branch_type: branch.type,
      status: "ACTIVE",
      ...audit,
    });
  }

  for (const site of SITES) {
    await upsert(client, "sites", "site_id", {
      site_id: siteIds[site.key],
      company_id: companyId,
      branch_id: branchIds[site.branchKey],
      site_code: site.code,
      name: site.name,
      site_type: "PERMANENT",
      category: site.category,
      start_date: "2012-06-01",
      geo_lat: site.geoLat,
      geo_long: site.geoLong,
      timezone: site.timezone,
      status: "ACTIVE",
      ...audit,
    });
  }

  for (const department of DEPARTMENTS) {
    const site = SITES.find((entry) => entry.key === department.siteKey);
    await upsert(client, "departments", "department_id", {
      department_id: deptIds[department.key],
      company_id: companyId,
      branch_id: branchIds[site.branchKey],
      site_id: siteIds[department.siteKey],
      department_code: department.code,
      name: department.name,
      department_type: department.type,
      status: "ACTIVE",
      ...audit,
    });
  }

  // Penempatan pengguna diisi setelah organisasinya ada.
  for (const user of USERS) {
    await upsert(client, "users", "user_id", {
      user_id: userIds[user.key],
      tenant_id: TENANT_ID,
      email: user.email,
      full_name: user.fullName,
      site_id: siteIds[user.siteKey],
      department_id: user.deptKey ? deptIds[user.deptKey] : null,
      updated_by: budiId,
    });
  }

  await upsert(client, "tenant_branding_configs", "tenant_branding_config_id", {
    tenant_branding_config_id: uuidFor("branding", TENANT_CODE),
    tenant_id: TENANT_ID,
    display_name: "Petro Nusantara Sejahtera — QHSE Portal",
    primary_color: "#0B5D8C",
    created_by: budiId,
    updated_by: budiId,
  });

  return {
    tenantId: TENANT_ID,
    companyId,
    siteIds,
    branchIds,
    deptIds,
    userIds,
    users: USERS.map((user) => ({ ...user, id: userIds[user.key] })),
    audit,
    demoPassword: DEMO_PASSWORD,
    startDate: dateOnly(new Date("2010-03-15")),
  };
}

/** Pencari pelaku berdasar peran — dipakai berkas modul supaya pelakunya
 * masuk akal terhadap pekerjaannya, bukan satu orang untuk segalanya. */
function actor(ctx, roleCode) {
  const found = ctx.users.find((user) => user.roleCode === roleCode);
  if (!found) throw new Error(`Tidak ada pengguna demo dengan peran ${roleCode}.`);
  return found;
}

function actors(ctx, roleCode) {
  return ctx.users.filter((user) => user.roleCode === roleCode);
}

module.exports = { seedFoundation, actor, actors, TENANT_ID, TENANT_CODE, DEMO_PASSWORD, USERS };
