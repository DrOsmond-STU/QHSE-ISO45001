# DEPLOYMENT.md — Panduan Deployment

## Dokumen Kontrol

| Item | Keterangan |
|---|---|
| Nama Produk | QHSE Enterprise Platform |
| Jenis Dokumen | Runbook deployment praktis — mengoperasionalkan [TDD §17](tdd/00-MASTER-TDD.md#17-deployment-architecture) menjadi prosedur konkret langkah-demi-langkah |
| Versi | 0.2 (4 open question §15 telah diputuskan — lihat riwayat §15) |
| Tanggal | 2026-07-23 |
| Status | Draft — menunggu review tim Engineering/DevOps |
| Dokumen Terkait | [TDD §17](tdd/00-MASTER-TDD.md#17-deployment-architecture) (arsitektur deployment), [TDD §6.1](tdd/00-MASTER-TDD.md#61-konvensi-tambahan-di-atas-master-prd-11) (migration tool), [TDD §21](tdd/00-MASTER-TDD.md#21-disaster-recovery--backup--detail-teknis) (DR/backup), [TESTING.md §12](TESTING.md#12-definition-of-done--checklist-testing-per-modulfitur-baru) (Definition of Done testing) |
| Cakupan | Bagaimana perubahan **benar-benar sampai ke production** dengan aman — checklist pra-deploy, alur pipeline konkret, strategi migrasi database tanpa downtime, rollback, dan runbook khusus klien on-premise. |

> **Konteks penting**: platform ini menangani data operasional keselamatan kerja yang dipakai lintas shift 24/7 di lokasi industri (pabrik, rig, tambang) — bukan aplikasi kantor yang "aman" mati di luar jam kerja. Prinsip deployment di sini mengutamakan **zero-downtime by default**, bukan sekadar "deploy di luar jam sibuk".

---

## 1. Prinsip Deployment

1. **Zero-downtime sebagai default**, bukan pengecualian — Work Permit, Incident Reporting, dan Emergency Response harus tetap bisa diakses kapan pun, termasuk saat deploy berlangsung.
2. **Migrasi database backward-compatible wajib** (expand-contract, §6) — kode versi lama HARUS tetap berjalan normal terhadap skema baru selama rolling update berlangsung.
3. **Rollback aplikasi harus lebih murah daripada rollback data** — desain migrasi mengasumsikan rollback kode itu mudah (revert image), sedangkan rollback skema/data itu mahal/berisiko — jadi hindari migrasi yang membuat rollback kode jadi tidak mungkin.
4. **Approval manusia sebelum production** — tidak ada deploy production yang sepenuhnya otomatis tanpa gate approval ([TDD §17.1](tdd/00-MASTER-TDD.md#171-cloud-saas-multi-tenant)), mengingat dampak data legal/audit trail.
5. **On-premise klien Enterprise punya kadensi berbeda** (§8) — paket rilis terjadwal, bukan continuous deploy, karena akses tim engineering ke lingkungan klien terbatas.

---

## 2. Ringkasan Environment

| Environment | Tujuan | Akses Deploy | Data |
|---|---|---|---|
| `dev` | Integrasi harian | Otomatis dari branch manapun via PR preview | Sintetis |
| `staging` | UAT, demo tenant pilot, regression pra-rilis | Otomatis setiap merge ke `main` | Sintetis realistis / tersanitasi ([TESTING.md §16](TESTING.md#16-lingkungan-test--data-refresh)) |
| `production` | Live tenant | **Manual approval gate**, hanya dari tag rilis (§4) | Data nyata |
| On-premise klien | Instance khusus 1 tenant Enterprise | Paket rilis terjadwal (§8) | Data nyata, akses terbatas |

---

## 3. Prasyarat Sebelum Deploy ke Production

Checklist wajib — **semua item harus centang** sebelum tag rilis dibuat:

- [ ] Seluruh test CI hijau, termasuk suite E2E kritis ([TESTING.md §7](TESTING.md#7-test-e2e--alur-kritis-lintas-modul)).
- [ ] Migration baru (jika ada) sudah direview eksplisit sebagai **backward-compatible** (§6) oleh minimal 1 reviewer berbeda dari penulis migration.
- [ ] Jika migration menyentuh tabel volume tinggi (`system_audit_logs`, dsb.) — sudah diuji waktu eksekusi migrasi di staging dengan volume data sebanding production.
- [ ] Feature flag (§10) sudah diset untuk fitur yang belum siap rilis penuh ke semua tenant.
- [ ] Secrets/config baru (jika ada) sudah diprovisioning di secret manager production (§9) — **bukan** ditambahkan saat deploy berlangsung.
- [ ] Dashboard observability (§11) sudah punya metric/alert untuk fitur baru yang berdampak signifikan.
- [ ] Changelog/release notes disiapkan untuk tim support & tenant (jika ada perubahan visible ke user).

---

## 4. Alur Pipeline CI/CD

```
PR dibuka
  → lint + unit test (Jest) — cepat, blocking
  → build affected packages (Turborepo, §4.1 TDD)
  → integration test (Testcontainers, ephemeral Postgres) — blocking
  → contract test (OpenAPI) — blocking
  ── merge ke main ──
  → build image (tag: git SHA)
  → deploy ke staging OTOMATIS
  → smoke test staging otomatis (§11)
  → [opsional] jalankan E2E penuh terhadap staging
  ── siap rilis ──
  → buat tag rilis (mis. v2026.07.2)
  → APPROVAL GATE MANUAL (Tech Lead / Engineering Manager)
  → deploy production (strategi §5)
  → smoke test production otomatis (§11)
  → monitoring aktif diperketat (§11) selama 1–2 jam pasca-deploy
```

Deploy production **tidak pernah** langsung dari branch — selalu dari tag rilis yang sudah melewati staging, untuk menjamin apa yang di-UAT di staging persis sama dengan yang naik ke production.

---

## 5. Strategi Rilis — Kapan Pakai Yang Mana

| Jenis Perubahan | Strategi | Alasan |
|---|---|---|
| Perubahan non-breaking rutin (bug fix, fitur baru di belakang feature flag) | **Rolling update** standar (Kubernetes default) | Risiko rendah, tidak butuh kontrol ekstra |
| Perubahan berisiko tinggi: migrasi skema besar, perubahan RBAC/Workflow Engine, perubahan payment/licensing | **Blue-green atau canary** | Butuh kemampuan rollback instan tanpa menunggu rolling selesai; canary membatasi blast radius ke sebagian kecil traffic/tenant dulu |
| Perubahan yang menyentuh shared platform layer ([TDD §3.2](tdd/00-MASTER-TDD.md#32-batas-modular-monolith-bounded-context)) | **Canary** dengan monitoring ketat sebelum full rollout | Dampak lintas 31 modul sekaligus jika ada regresi ([TESTING.md §15](TESTING.md#15-regression-test-untuk-perubahan-infrastruktur-bersama)) |

### 5.1 Tool Canary/Progressive Delivery — Keputusan Final: **Argo Rollouts**

Dipilih dibanding Flagger atau solusi native cloud provider, dengan alasan:

- **Tidak butuh service mesh.** Flagger mewajibkan Istio/Linkerd/SMI untuk traffic shifting; stack ingress saat ini hanya Nginx/Traefik ([TDD §17.1](tdd/00-MASTER-TDD.md#171-cloud-saas-multi-tenant)) — menambah service mesh murni demi canary adalah kompleksitas operasional yang tidak sepadan.
- **CRD Kubernetes native** (`Rollout`, `AnalysisTemplate`) — tidak vendor-locked ke satu cloud provider tertentu, konsisten dipakai baik di cloud SaaS maupun di instance on-prem klien Enterprise skala besar yang memilih opsi k8s single-node/small-cluster ([TDD §17.2](tdd/00-MASTER-TDD.md#172-on-premise-enterprise-tier)).
- **`AnalysisTemplate` berbasis query Prometheus** langsung memanfaatkan stack observability yang sudah ada (Grafana/Alertmanager, §11) — jadi fondasi langsung untuk ambang rollback otomatis (§7.3), tanpa integrasi tambahan.
- Trade-off yang diterima: kurva belajar CRD Argo Rollouts dibanding `Deployment` biasa — dianggap sepadan karena kebutuhan canary eksplisit sudah ada sejak §5 di atas.

```bash
# Rolling update standar
kubectl rollout status deployment/api -n production

# Canary via Argo Rollouts — 10% traffic dulu, dievaluasi otomatis oleh AnalysisTemplate (§7.3)
kubectl argo rollouts set image api api=registry/qhse-api:v2026.07.2
kubectl argo rollouts get rollout api --watch   # pantau progres step & hasil analysis
kubectl argo rollouts promote api               # manual promote setelah canary window aman & analysis lolos
```

---

## 6. Migrasi Database — Pola Expand-Contract

Migrasi database **tidak pernah** dalam satu langkah yang memutus kompatibilitas dengan kode versi lama yang masih berjalan selama rolling update. Contoh konkret menambah kolom wajib (`NOT NULL`) ke tabel yang sudah punya data:

```
Langkah 1 (EXPAND) — rilis N
  ALTER TABLE incident_reports ADD COLUMN severity_v2 VARCHAR(20) NULL;
  → Kode versi baru menulis ke severity_v2 DAN severity (kolom lama), kode versi lama tetap
    hanya menulis ke severity — keduanya tetap valid berjalan bersamaan.

Langkah 2 (BACKFILL) — job terpisah, async, bisa berjalan lama
  → Job mengisi severity_v2 untuk baris lama berdasarkan severity.
  → Backfill TIDAK memblokir tabel (batch kecil, lihat TDD §20 pola batch import).

Langkah 3 (MIGRATE READ) — rilis N+1 (setelah backfill selesai & terverifikasi)
  → Kode mulai membaca dari severity_v2 sebagai source of truth.
  → Kode masih menulis dobel ke severity (kolom lama) untuk jaga-jaga rollback ke rilis N.

Langkah 4 (CONTRACT) — rilis N+2 (setelah rilis N+1 stabil, biasanya ≥1 siklus rilis)
  ALTER TABLE incident_reports ALTER COLUMN severity_v2 SET NOT NULL;
  ALTER TABLE incident_reports DROP COLUMN severity;
  → Kolom lama baru dihapus di sini — TIDAK PERNAH di rilis yang sama dengan penambahan kolom baru.
```

**Aturan wajib**: menambah kolom `NOT NULL` tanpa default, mengubah tipe kolom secara destruktif, atau menghapus kolom **tidak boleh** dalam satu migration/rilis yang sama dengan deploy kode yang bergantung padanya — selalu dipisah minimal 2 rilis (expand dulu, contract belakangan) sesuai [TDD §17.1](tdd/00-MASTER-TDD.md#171-cloud-saas-multi-tenant).

Migrasi dijalankan sebagai **job Kubernetes terpisah sebelum rollout pod baru**, bukan `postStart` hook — supaya migrasi gagal terdeteksi sebelum traffic diarahkan ke versi baru:

```bash
kubectl apply -f infra/k8s/jobs/migrate-production.yaml
kubectl wait --for=condition=complete job/migrate-production -n production --timeout=300s
# baru lanjut ke rollout deployment jika job di atas sukses
```

---

## 7. Rollback

### 7.1 Rollback Aplikasi (Cepat, Selalu Aman Jika §6 Diikuti)
```bash
kubectl rollout undo deployment/api -n production
kubectl rollout undo deployment/worker -n production
```
Karena migrasi mengikuti expand-contract (§6), rollback aplikasi ke versi image sebelumnya **selalu aman** terhadap skema database saat itu — ini alasan utama pola expand-contract dipaksakan, bukan sekadar praktik baik.

### 7.2 Rollback Migrasi Database (Jarang, Berisiko — Hindari Jika Bisa)
- Migration **tidak** ditulis dengan asumsi akan di-`down()` di production — `down migration` hanya untuk kebutuhan development lokal.
- Jika migrasi sudah terlanjur salah di production: **jangan** jalankan reverse migration langsung — buat migration BARU yang memperbaiki (forward-only), sesuai prinsip "hindari destructive rollback" di aturan keselamatan repo secara umum.
- Untuk kasus darurat data korup akibat migrasi: pulihkan dari PITR ([TDD §21](tdd/00-MASTER-TDD.md#21-disaster-recovery--backup--detail-teknis)) ke lingkungan terisolasi, verifikasi, baru pertimbangkan langkah lanjut — tidak pernah restore langsung menimpa production tanpa verifikasi.

### 7.3 Kriteria Trigger Rollback
| Sinyal | Aksi |
|---|---|
| Error rate API > ambang alert (§11) dalam 5 menit pasca-deploy | Rollback aplikasi segera, investigasi setelah stabil |
| Queue depth (BullMQ) menumpuk tidak wajar | Cek worker versi baru dulu sebelum rollback penuh — bisa jadi cukup restart worker |
| Laporan user: approval/workflow tersangkut | Prioritas tinggi — Workflow Engine berdampak lintas modul ([TESTING.md §15](TESTING.md#15-regression-test-untuk-perubahan-infrastruktur-bersama)) |
| Kebocoran data lintas tenant terindikasi (RLS gagal) | **Rollback + putuskan akses publik sementara jika perlu** — insiden keamanan (lihat [SECURITY.md](SECURITY.md)), eskalasi immediate, bukan menunggu proses rollback normal |

### 7.4 Ambang Kuantitatif Rollback Otomatis (Tahap Canary)

Selama tahap **canary** (§5.1, sebelum full rollout 100%), rollback otomatis dijalankan oleh `AnalysisTemplate` Argo Rollouts berbasis query Prometheus — tanpa menunggu keputusan manusia. Setelah rollout mencapai 100% dan analysis step canary tidak lagi berjalan, rollback kembali mengikuti prosedur manual §7.1/§7.3.

| Metrik | Ambang Auto-Rollback | Catatan |
|---|---|---|
| HTTP 5xx error rate (canary vs baseline) | > 5% dalam window bergulir 5 menit | Baseline normal diasumsikan < 1%; ambang diberi buffer besar agar tidak sensitif ke noise sesaat |
| P95 latency canary | > 2x baseline **atau** > 1000ms absolut, bertahan 5 menit berturut-turut | NFR target normal P95 < 300ms (Master PRD §14.1) — ambang rollback sengaja jauh di atas target agar hanya memicu untuk regresi nyata, bukan fluktuasi biasa |
| Health check endpoint canary | Gagal 3x berturut-turut (interval polling standar) | Step canary otomatis gagal, Argo Rollouts abort + rollback tanpa promote |
| Queue depth (BullMQ) | **Tidak diotomasi** | Tetap butuh judgment manusia (bisa jadi cukup restart worker, bukan rollback) — lihat §7.3 |
| Kebocoran data lintas tenant (RLS) | **Tidak diotomasi** | Selalu manual + eskalasi keamanan segera — insiden keamanan tidak boleh menunggu evaluasi metric otomatis, lihat §7.3 |

Ambang di atas adalah baseline awal — wajib dikalibrasi ulang setelah beberapa siklus rilis production nyata berjalan (data noise aktual bisa berbeda dari asumsi awal ini).

---

## 8. Deployment On-Premise (Klien Enterprise)

Berbeda dari cloud SaaS — mengikuti [TDD §17.2](tdd/00-MASTER-TDD.md#172-on-premise-enterprise-tier):

1. **Paket rilis terjadwal** (mis. bulanan/kuartalan sesuai kontrak klien) — bukan continuous deploy, karena akses tim engineering ke lingkungan klien terbatas dan perubahan mendadak berisiko tinggi di lingkungan industri kritis.
2. **Staging klien dulu**: paket rilis diuji di lingkungan staging milik klien (atau staging tervirtualisasi yang meniru konfigurasinya) sebelum menyentuh production klien.
3. **Image container identik** dengan cloud — perbedaan hanya `DEPLOYMENT_MODE=ONPREM_SINGLETENANT` dan environment variable spesifik klien ([TDD §5.3](tdd/00-MASTER-TDD.md#53-isolasi-on-premise-single-tenant-deployment)) — mencegah drift dua codebase berbeda.
4. **Checklist paket rilis on-prem** sebelum dikirim ke tim onsite/klien:
   - [ ] Changelog & migration script tervalidasi di staging klien.
   - [ ] Prosedur rollback on-prem didokumentasikan spesifik (klien mungkin tidak punya Kubernetes — bisa jadi hanya Docker Compose, §7.1 tidak otomatis berlaku sama).
   - [ ] Jadwal maintenance window dikoordinasikan dengan klien (klien sektor migas/tambang punya jadwal shift ketat — hindari window yang bentrok jam kritis operasional mereka).
   - [ ] Kontak eskalasi darurat klien tersedia jika rilis bermasalah di luar jam kerja tim engineering.
5. **Change freeze khusus klien**: hindari rilis ke instance on-prem klien menjelang audit sertifikasi/re-sertifikasi ISO/SMK3 terjadwal klien tersebut (koordinasikan tanggal dengan Tenant Admin klien) — perubahan sistem tepat sebelum audit eksternal berisiko mengganggu kesiapan bukti kepatuhan yang sedang dipersiapkan. Detail presisi periode freeze: lihat §14.1.

### 8.1 SLA Maintenance Window On-Premise — Baseline Default Kontraktual

Klien Enterprise migas/tambang punya jadwal shift 24/7 ketat, sehingga window maintenance **wajib** eksplisit di kontrak/SOW, bukan diasumsikan fleksibel seperti cloud SaaS. Baseline default berikut dipakai sebagai klausul standar SOW kecuali dinegosiasikan lain secara tertulis per klien:

| Parameter | Default |
|---|---|
| Durasi maksimum per window | 4 jam untuk rilis regular (selaras dengan RTO target §21 TDD) |
| Frekuensi | Mengikuti paket rilis terjadwal klien (bulanan atau kuartalan, sesuai poin 1 di atas) |
| Waktu pelaksanaan | Rekomendasi default 00:00–04:00 waktu lokasi klien, atau akhir pekan — **di luar** jam shift kritis operasional (hindari serah-terima shift/awal shift) |
| Notifikasi minimum ke klien | H-7 (7 hari kalender) sebelum window, dikonfirmasi tertulis oleh Tenant Admin klien |
| Downtime aplikasi selama window | Diperbolehkan penuh (berbeda dari prinsip zero-downtime cloud SaaS, §1) — tetap diusahakan < durasi window yang disepakati, dengan buffer untuk rollback jika gagal |
| Rilis darurat (hotfix keamanan kritis) | **Di luar** klausul window reguler ini — jalur terpisah, kapan pun, dikoordinasikan langsung via kontak eskalasi darurat klien (poin 4 di atas) |

Baseline ini bisa diperketat atau diperlonggar per kontrak spesifik klien (mis. klien dengan operasi kontinu tanpa jendela idle sama sekali mungkin minta window lebih pendek + lebih sering) — tapi jika tidak dinegosiasikan eksplisit, default di atas yang berlaku sebagai fallback kontraktual.

---

## 9. Secrets & Configuration per Environment

- Mengikuti [TDD §16](tdd/00-MASTER-TDD.md#16-keamanan-teknis) & [TDD §18](tdd/00-MASTER-TDD.md#18-environment--configuration-management) — tidak diulang detailnya di sini.
- **Aturan operasional tambahan**: secret production tidak pernah disalin manual ke staging/dev untuk "kemudahan testing" — staging punya secret sendiri (kredensial sandbox provider eksternal, §11 TESTING.md).
- Rotasi secret mengikuti jadwal terpisah (lihat referensi proses `secrets-rotation-runbook`), **tidak digabung** dengan siklus deploy rutin — rotasi adalah proses keamanan berjadwal sendiri.

---

## 10. Feature Flag & Rollout Bertahap

- Fitur baru berisiko/besar dirilis di belakang feature flag, diaktifkan bertahap: **internal dulu → tenant pilot → seluruh tenant** ([TDD §18](tdd/00-MASTER-TDD.md#18-environment--configuration-management)).
- Flag dikelola di database per tenant (bukan environment variable global) — konsisten dengan prinsip konfigurasi per tenant di DB ([TDD §18](tdd/00-MASTER-TDD.md#18-environment--configuration-management)).
- Flag yang sudah 100% rollout & stabil ≥1 siklus rilis **wajib dibersihkan** (dead code) — flag lama yang menumpuk adalah utang teknis, bukan dokumentasi sejarah.

---

## 11. Verifikasi Pasca-Deploy (Post-Deploy Smoke Test)

Checklist otomatis dijalankan segera setelah traffic diarahkan ke versi baru:

- [ ] Health check endpoint (`/health`) merespons 200 di semua pod.
- [ ] Login (OIDC flow) berhasil end-to-end di staging/production.
- [ ] Submit 1 record uji per beberapa modul kunci (Work Permit, Incident) di lingkungan staging berhasil tanpa error — **tidak** di production dengan data sungguhan.
- [ ] Dashboard Grafana ([TDD §15](tdd/00-MASTER-TDD.md#15-observability)) menunjukkan error rate & latency normal dalam 15 menit pertama.
- [ ] Queue depth BullMQ tidak menumpuk abnormal dibanding baseline.
- [ ] Tidak ada alert baru muncul di Alertmanager terkait deploy ini.

Monitoring diperketat (cek manual berkala, bukan hanya menunggu alert) selama 1–2 jam pasca-deploy production untuk perubahan signifikan.

---

## 12. Komunikasi Insiden Saat Deploy Bermasalah

1. Deploy yang memicu rollback (§7.3) **wajib** diumumkan ke channel internal tim engineering segera — bukan diam-diam diperbaiki lalu dilupakan.
2. Jika insiden berdampak visible ke tenant (downtime, data anomali): notifikasi ke tenant terdampak mengikuti proses komunikasi krisis, dengan nada sesuai [BRAND.md §7.3](BRAND.md#73-matriks-tone-per-konteks) (faktual, tidak defensif, jelas apa yang terjadi & langkah perbaikan).
3. Post-mortem blameless wajib untuk insiden yang memicu rollback production atau berdampak ke tenant — fokus pada perbaikan proses (mis. gap di checklist §3 yang lolos), bukan mencari siapa yang salah.

---

## 13. Release Checklist Ringkas (Gabungan)

Sebelum tag rilis dibuat, gabungan dari [TESTING.md §12](TESTING.md#12-definition-of-done--checklist-testing-per-modulfitur-baru) + §3 dokumen ini:

- [ ] Semua item Definition of Done testing per fitur/modul yang termasuk rilis ini.
- [ ] Semua item prasyarat deploy (§3).
- [ ] Release notes/changelog siap.
- [ ] Rencana rollback (§7) sudah jelas untuk siapa pun yang on-call saat window rilis.

---

## 14. Kadensi Rilis & Change Freeze

- **Cloud SaaS**: rilis rutin (disarankan mingguan untuk perubahan kecil, kapan pun untuk hotfix kritis) — tidak dibatasi jam kerja karena zero-downtime by default (§1), tapi window rilis besar tetap dijadwalkan di jam dengan traffic lebih rendah untuk mengurangi blast radius jika terjadi masalah.
- **Change freeze**: dihindari rilis fitur besar/berisiko menjelang periode dengan eksposur tinggi — mis. akhir tahun fiskal tenant (laporan Management Review, [Modul 22](prd/modules/22-management-review.md)), atau musim audit sertifikasi yang diketahui banyak tenant sekaligus. Definisi presisi: lihat §14.1.
- **On-premise**: mengikuti kadensi terjadwal per klien (§8), terpisah dari kadensi cloud.

### 14.1 Definisi Presisi "Periode Change Freeze"

Dua jenis freeze, berbeda cakupan dan mekanisme penerapan:

**a) Freeze global (berlaku seluruh cloud SaaS)**
- Periode: **18 Desember – 7 Januari** (2 minggu terakhir tahun kalender + minggu pertama tahun baru) — periode libur luas & staffing tim Engineering/on-call minim.
- Cakupan yang di-freeze: fitur besar/berisiko baru — migrasi skema besar, perubahan RBAC/Workflow Engine, perubahan payment/licensing, perubahan shared platform layer (§5 baris ke-3).
- **Dikecualikan dari freeze** (tetap boleh rilis): bug fix kecil non-breaking, dan hotfix keamanan kritis (§1 prinsip 4 tetap berlaku — approval manusia tetap wajib, hanya freeze fitur besar yang dilonggarkan untuk kasus ini).

**b) Freeze per-tenant (granular, terkait audit sertifikasi)**
- Periode: **H-14 hingga H+3** dari tanggal audit sertifikasi/re-sertifikasi ISO 45001/SMK3 tenant tersebut, sebagaimana dikonfirmasi tertulis oleh Tenant Admin klien.
- Cakupan: karena arsitektur cloud SaaS multi-tenant (namespace per environment, bukan per tenant, [TDD §17.1](tdd/00-MASTER-TDD.md#171-cloud-saas-multi-tenant)) — freeze ini **tidak** menahan seluruh rilis cloud, melainkan diterapkan granular via feature flag (§10) yang menahan rollout fitur baru/berisiko khusus ke tenant bersangkutan, sementara tenant lain tetap menerima rilis normal.
- On-premise klien: karena instance terpisah per klien, freeze berarti tidak ada paket rilis terjadwal (§8) yang dijadwalkan jatuh di window ini — dikoordinasikan sejak awal saat penjadwalan paket rilis (checklist §8 poin 4).
- **Sumber data tanggal**: tim Customer Success bertanggung jawab mengumpulkan & menjaga kalender tanggal audit sertifikasi per tenant Enterprise (berbasis kontrak & data [Modul 22 Management Review](prd/modules/22-management-review.md)), diperbarui setiap kali Tenant Admin mengonfirmasi jadwal baru — ini proses operasional CS berjalan, bukan lagi menunggu "data pola nyata" seperti draf sebelumnya; ambang H-14/H+3 di atas akan disempurnakan begitu tersedia data historis dari beberapa siklus audit tenant nyata.

---

## 15. Riwayat Keputusan (Sebelumnya "Asumsi & Open Questions")

4 open question draf v0.1 sudah diputuskan di v0.2 ini sebagai baseline kerja — semua tetap **dapat direvisi** begitu ada data operasional nyata (kalibrasi ambang, negosiasi kontrak klien, dsb.), tapi tidak lagi berstatus "belum diputuskan":

1. ~~Tool canary/progressive delivery final~~ → **Diputuskan: Argo Rollouts** (lihat §5.1 untuk alasan lengkap & trade-off).
2. ~~SLA maintenance window on-premise~~ → **Diputuskan: baseline default 4 jam/window, notifikasi H-7, di luar jam shift kritis** (lihat §8.1) — berlaku sebagai fallback kontraktual, tetap bisa dinegosiasikan per klien.
3. ~~Ambang kuantitatif trigger rollback otomatis~~ → **Diputuskan: threshold error rate/latency/health-check via Argo Rollouts `AnalysisTemplate`** (lihat §7.4), berlaku khusus tahap canary.
4. ~~Definisi presisi periode change freeze~~ → **Diputuskan: freeze global 18 Des–7 Jan + freeze granular per-tenant H-14/H+3 dari tanggal audit sertifikasi** (lihat §14.1), dengan CS sebagai pemilik data kalender audit per tenant.

**Sisa item yang masih perlu tindak lanjut** (bukan lagi "belum diputuskan", tapi butuh eksekusi/validasi lanjutan):
- Kalibrasi ulang ambang §7.4 setelah beberapa siklus rilis production nyata (data noise aktual vs asumsi awal).
- Tim Customer Success mulai membangun & menjaga kalender tanggal audit sertifikasi per tenant Enterprise (input untuk §14.1b).
- Negosiasi klausul SLA §8.1 aktual per kontrak klien Enterprise baru — baseline ini dipakai sebagai starting point draft SOW, bukan angka final tanpa review legal/komersial.

---

*Dokumen ini mengoperasionalkan [TDD §17](tdd/00-MASTER-TDD.md#17-deployment-architecture). Perubahan strategi deployment yang signifikan (platform orkestrasi, strategi rilis) wajib disinkronkan kembali ke TDD agar kedua dokumen tidak divergen.*
