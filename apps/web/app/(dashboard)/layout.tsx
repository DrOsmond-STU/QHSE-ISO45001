import type { ReactNode } from "react";
import { AppShell } from "./app-shell";

// Layout route group (dashboard) — semua isinya dipindahkan ke AppShell
// (client component) karena shell butuh state interaktif: penjaga sesi,
// drawer mobile, toggle tema, tombol keluar. Layout ini sendiri tetap server
// component supaya halaman anak bebas memilih server/client sendiri.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
