import type { ReactNode } from "react";
import Link from "next/link";
import "./dashboard-shell.css";

// Task 1.7 — lihat banner comment dashboard-shell.css: shell PLACEHOLDER
// minimal, BUKAN task 0.14. Cukup utk halaman notifications/* task ini
// bisa dinavigasi (link Notifikasi <-> Preferensi), tidak lebih.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="qhse-shell-placeholder">
      <header className="qhse-shell-placeholder__header">
        <Link href="/" className="qhse-shell-placeholder__brand">
          QHSE Platform
        </Link>
        <nav className="qhse-shell-placeholder__nav">
          <Link href="/notifications">Notifikasi</Link>
          <Link href="/notifications/preferences">Preferensi</Link>
        </nav>
      </header>
      <main className="qhse-shell-placeholder__main">{children}</main>
    </div>
  );
}
