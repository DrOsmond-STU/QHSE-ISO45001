# QHSE Platform — Demo Guide

## The company

**PT Petro Nusantara Sejahtera** — a fictional Indonesian oil & gas operator, headquartered in Jakarta with two field sites: **Cepu** (production field) and **Balikpapan** (terminal & refinery). The tenant is provisioned on the `OIL_GAS` industry template, which is why Work Permit and Contractor Management enforce the sector-specific gates (gas testing, IUJP/CSMS documents, etc.) throughout the demo data.

All 16 backend modules are populated with realistic, interconnected data spanning every lifecycle state (draft, pending approval, approved, rejected, closed, overdue) — not just happy-path examples.

## 1. Start the API

```bash
cd qhse-platform/apps/api
pnpm exec ts-node -r ts-node/register/transpile-only src/main.ts
```

Server listens on `http://localhost:3001` (override with `PORT`). Wait for `[qhse-api] listening on :3001` in the log before calling anything.

## 2. Import into Postman

Import `docs/demo/QHSE-Platform-Demo.postman_collection.json` (File → Import). It's self-contained — no separate environment file needed, all variables live at the collection level.

Run **`00 - Auth`** first: "1. Login" then "2. Token Exchange", in order. The access token is captured automatically into `{{accessToken}}` and every other request in the collection uses it via collection-level Bearer auth. Token expires after 15 minutes — just re-run both Auth requests if you start seeing `401`.

Every other folder can then be run in any order. Each module folder follows the same **List → Detail** shape: the List request captures the first returned record's id into a variable, and the Detail request reuses it — so just click "Send" top-to-bottom within a folder.

## 3. Demo logins

Every user shares the password **`Demo!QHSE2026`**. Change `loginEmail` / `loginPassword` in the `00 - Auth` folder's collection variables and re-run both Auth requests to switch identity.

| Email | Role | Name | Notes |
|---|---|---|---|
| `budi.santoso+393749@petro-ns.demo` | TENANT_ADMIN | Budi Santoso | Default demo login — broadest read access across modules |
| `siti.rahayu@petro-ns.demo` | COMPANY_ADMIN | Siti Rahayu | |
| `andi.wijaya@petro-ns.demo` | HSE_MANAGER | Andi Wijaya | |
| `dewi.lestari@petro-ns.demo` | HSE_OFFICER | Dewi Lestari | Site Cepu |
| `rudi.hartono@petro-ns.demo` | HSE_OFFICER | Rudi Hartono | Site Balikpapan |
| `agus.setiawan@petro-ns.demo` | DEPARTMENT_HEAD | Agus Setiawan | Has `restricted_duty.view` |
| `hendra.kusuma@petro-ns.demo` | SUPERVISOR | Hendra Kusuma | Produksi Cepu — has `restricted_duty.view` |
| `yusuf.pratama@petro-ns.demo` | SUPERVISOR | Yusuf Pratama | Terminal Balikpapan |
| `maria.simanjuntak@petro-ns.demo` | AUDITOR_INTERNAL | Maria Simanjuntak | |
| `robert.tanjung@auditor-eksternal.demo` | AUDITOR_EXTERNAL | Robert Tanjung | External domain, by design |
| `joko.susilo@petro-ns.demo` | WORKER_EMPLOYEE | Joko Susilo | |
| `bambang.suryadi@petro-ns.demo` | WORKER_EMPLOYEE | Bambang Suryadi | |
| `fitri.handayani@petro-ns.demo` | WORKER_EMPLOYEE | Fitri Handayani | |
| `eko.prasetyo@petro-ns.demo` | WORKER_EMPLOYEE | Eko Prasetyo | |
| `ahmad.fauzi@kontraktor-mitra.demo` | CONTRACTOR_USER | Ahmad Fauzi | External contractor login |
| `visitor@petro-ns.demo` | VISITOR_SELF_SERVICE | Tamu Kunjungan | |
| `ratna.sari@petro-ns.demo` | OCCUPATIONAL_HEALTH_STAFF | dr. Ratna Sari | Only user with live PHI authorization grant |
| `nina.puspita@petro-ns.demo` | DOCUMENT_CONTROLLER | Nina Puspita | |
| `iwan.setiabudi@petro-ns.demo` | COMPLIANCE_OFFICER | Iwan Setiabudi | |
| `lina.marlina@petro-ns.demo` | QUALITY_MANAGER | Lina Marlina | |
| `dedi.kurniawan@petro-ns.demo` | QC_INSPECTOR | Dedi Kurniawan | |
| `wahyu.nugroho@petro-ns.demo` | ENVIRONMENTAL_OFFICER | Wahyu Nugroho | |
| `yanto.gunawan@petro-ns.demo` | TPS_LB3_OFFICER | Yanto Gunawan | |

`tenantId` (needed as the `x-tenant-id` header on login only — every later request reads it from the JWT): `4732cbf1-9270-432d-870a-4b6aa35461ae`

> The TENANT_ADMIN email has a random suffix baked in at seed time (`budi.santoso+<random>@petro-ns.demo`). The value above is correct for the tenant currently in the dev database. If the demo seed script (`apps/api/prisma/seed-demo-data.ts`) is ever re-run, grab the fresh email/tenantId from its final JSON summary output and update the Postman collection variables.

## 4. What's read-only vs. what isn't

The Postman collection only exposes **`GET` list + detail** endpoints — deliberately minimal, built specifically to make this demo data browsable via HTTP (see "Why 15 new controllers" below). It does **not** let you create, approve, or reject anything live. Two consequences worth knowing before the walkthrough:

- **BR-02 (Contractor → Work Permit)**: contractor "PT Baja Perkasa Enjiniring" has an intentionally `EXPIRED` compliance document. In the real system, `WorkPermitService.create()` rejects any new permit naming that contractor. There's no `POST /work-permits` in this demo API to trigger that live — it's verified by the automated integration test suite instead (`apps/api/test/contractor/contractor-lifecycle.integration-spec.ts`, the `BR-02` test case).
- **Occupational Health**: only `restricted_duty_assignments` is exposed (a table the schema explicitly documents as a "non-clinical boundary field"). Medical records, MCU results, and PAK cases are **not** exposed by any endpoint — they sit behind a dual-gate (RBAC permission + a live per-user PHI authorization grant), and building that into a "minimal" read layer was out of scope. To see that data, use Prisma Studio (`pnpm exec prisma studio` from `apps/api`) against the dev database, logged in as `ratna.sari@petro-ns.demo` conceptually (Prisma Studio itself bypasses RLS as a superuser tool — treat it as an admin/debugging view, not a demo of the access-control system).

### Why 15 new controllers exist

Only `auth` and `notifications` had real HTTP controllers before this demo effort — every other module (Work Permit, Incident, Audit, CAPA, Quality, Environmental, Occupational Health, Contractor, etc.) was built service-layer-only, exercised by integration tests calling services directly via NestJS DI, with zero REST surface. To make "demo via Postman" possible at all, minimal read-only controllers (`GET` list + detail, existing RBAC permission codes, no new business logic) were added for the 15 modules that lacked them. Write operations for all of them still only exist at the service layer.

## 5. Suggested tour (logged in as Tenant Admin unless noted)

1. **Work Permit** — `GET /work-permits` shows 6 permits across every lifecycle state: draft, active (simple/hot-work-with-extension/confined-space-with-LOTO), rejected, pending-approval. Open the hot-work one's detail to see the extension linkage.
2. **Incident Management** — 6 reports from FIRST_AID up to a full FATALITY investigation with linked CAPA, witness statement, and regulatory report. The LTI one was REJECTED and returned to the investigator — a good example of the RETURNED state.
3. **Audit Management** — the Cepu audit is fully CLOSED with 2 findings; `GET /audits/{id}/findings` shows a MAJOR_NC finding that auto-created a CAPA (see next).
4. **CAPA Management** — that same CAPA is now `EFFECTIVE_CLOSED`, closing the loop back to the audit finding. Also look at the Management-Review CAPA: it cycled `NOT_EFFECTIVE → REOPENED → EFFECTIVE_CLOSED` (BR-04), and one `OTHER`-source CAPA was deliberately left in `DRAFT` with an overdue root-cause SLA.
5. **Contractor Management** — 4 contractors spanning REGISTERED → PREQUALIFIED → ACTIVE, one BLACKLISTED (BR-06, requires written justification), one with 2 consecutive UNACCEPTABLE evaluations (BR-07 triggers a notification to the HSE Manager).
6. **Occupational Health** — switch login to `hendra.kusuma@petro-ns.demo` (Supervisor) first, then `GET /restricted-duty-assignments`. Try it again as Tenant Admin afterward to see the `403` — a deliberate illustration of the platform's RBAC granularity around health-adjacent data.
7. **Calibration / Asset / Environmental** — each has at least one record mid-workflow (calibration `OUT_OF_TOLERANCE → CAPA`, asset `OUT_OF_SERVICE`, environmental monitoring `EXCEED` auto-triggering a CAPA) to show cross-module automation, not just static records.

## 6. Verifying anything beyond what's exposed

For anything not reachable through the read-only API (workflow approvals, PHI, scan-job side effects, exact row counts), the fastest path is:

```bash
cd qhse-platform/apps/api
pnpm exec prisma studio
```

This opens a full DB browser against the same dev database the demo tenant lives in — filter any table by `tenant_id = 4732cbf1-9270-432d-870a-4b6aa35461ae`.
