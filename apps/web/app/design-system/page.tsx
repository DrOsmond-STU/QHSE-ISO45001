import {
  StatusBadge,
  DataTable,
  FormField,
  KpiCard,
  WorkflowStepper,
  Button,
} from "@qhse/ui-components";

// Halaman demo verifikasi visual task 0.5 (Design tokens & komponen UI inti)
// — bukan bagian dari app shell final (itu task 0.14), cuma showcase.
export default function DesignSystemDemoPage() {
  const permitRows = [
    { id: "1", no: "WP/RIG14/2026/0512", risk: "critical" as const, status: "Menunggu HSE" },
    { id: "2", no: "WP/JKT01/2026/1186", risk: "good" as const, status: "Aktif" },
    { id: "3", no: "WP/SBY02/2026/0230", risk: "warning" as const, status: "Ditutup" },
  ];

  return (
    <main style={{ padding: 32, display: "flex", flexDirection: "column", gap: 32, maxWidth: 900 }}>
      <h1>Design System Demo — task 0.5</h1>

      <section>
        <h2>Status Badge (§3.3 / §7.5) — 4 tone, selalu ikon + label</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <StatusBadge tone="good" label="Aman" />
          <StatusBadge tone="warning" label="Perlu Perhatian" />
          <StatusBadge tone="serious" label="Segera Tindak" />
          <StatusBadge tone="critical" label="Bahaya" />
        </div>
      </section>

      <section>
        <h2>KPI Card (§7.4)</h2>
        <div style={{ display: "flex", gap: 16 }}>
          <KpiCard
            label="LTIFR"
            value="0.6"
            target="target < 1.0"
            trend={{ direction: "down", text: "25% vs semester lalu", sentiment: "improving" }}
          />
          <KpiCard
            label="CAPA Closure Rate"
            value="84%"
            target="target >= 90%"
            trend={{ direction: "down", text: "turun 4 poin", sentiment: "worsening" }}
          />
        </div>
      </section>

      <section>
        <h2>Workflow Stepper (§7.6)</h2>
        <WorkflowStepper
          stages={[
            { label: "Requester", status: "approved" },
            { label: "Issuer / Area Authority", status: "approved" },
            { label: "HSE Manager", status: "current", slaBreached: true },
            { label: "Aktif", status: "pending" },
            { label: "Closure", status: "pending" },
          ]}
        />
      </section>

      <section>
        <h2>Data Table (§7.3)</h2>
        <DataTable
          columns={[
            { key: "no", header: "No. Permit" },
            {
              key: "risk",
              header: "Risiko",
              render: (row) => (
                <StatusBadge
                  tone={row.risk}
                  label={
                    { good: "Rendah", warning: "Sedang", serious: "Tinggi", critical: "Kritis" }[row.risk]
                  }
                />
              ),
            },
            { key: "status", header: "Status" },
          ]}
          rows={permitRows}
          getRowId={(r) => r.id}
        />
      </section>

      <section>
        <h2>Form Field (§7.2)</h2>
        <FormField label="Judul Singkat" htmlFor="demo-title" required>
          <input id="demo-title" type="text" />
        </FormField>
        <FormField label="Deskripsi" htmlFor="demo-desc" error="Field ini wajib diisi">
          <textarea id="demo-desc" />
        </FormField>
      </section>

      <section>
        <h2>Button (§11 tap target)</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <Button>Batal</Button>
          <Button variant="accent">Simpan</Button>
          <Button variant="destructive">Tolak</Button>
        </div>
      </section>
    </main>
  );
}
