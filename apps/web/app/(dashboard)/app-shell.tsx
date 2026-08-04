"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@qhse/ui-components";
import { logout, readSession, type SessionInfo } from "../../lib/auth-session";
import { modulesByGroup } from "../../lib/modules";
import { useHasAccessToken } from "../../lib/use-auth-token";
import "./app-shell.css";

const THEME_KEY = "qhse.theme";

interface NavItem {
  href: string;
  label: string;
}

function navGroups(): Array<{ group: string; items: NavItem[] }> {
  return [
    {
      group: "Ringkasan",
      items: [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/analytics", label: "Analitik" },
        { href: "/scorecard", label: "Balanced Scorecard" },
        { href: "/ai", label: "Pencarian & Bantuan" },
        { href: "/approvals", label: "Kotak Persetujuan" },
      ],
    },
    ...modulesByGroup().map(({ group, modules }) => ({
      group,
      items: modules.map((module) => ({ href: `/modules/${module.slug}`, label: module.title })),
    })),
    {
      group: "Akun",
      items: [
        { href: "/notifications", label: "Notifikasi" },
        { href: "/notifications/preferences", label: "Preferensi Notifikasi" },
      ],
    },
  ];
}

/**
 * Toggle tema eksplisit — DESIGN §3.6: pilihan user MENANG atas preferensi OS
 * di kedua arah, jadi yang disimpan bukan "dark: ya/tidak" melainkan atribut
 * `data-theme` yang di tokens.css punya blok override sendiri terhadap
 * `prefers-color-scheme`.
 */
function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
      document.documentElement.dataset.theme = stored;
    }
  }, []);

  function toggle() {
    // Belum pernah dipilih -> ikuti preferensi OS saat ini, lalu balik.
    const current = theme ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem(THEME_KEY, next);
  }

  return (
    <Button variant="default" onClick={toggle} aria-label="Ganti tema terang/gelap">
      {theme === "dark" ? "Terang" : "Gelap"}
    </Button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hasToken = useHasAccessToken();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (hasToken === false) router.replace("/login");
    if (hasToken === true) setSession(readSession());
  }, [hasToken, router]);

  // Tutup drawer setiap kali rute berubah — kalau tidak, menu tetap menutupi
  // halaman baru yang barusan dibuka di layar kecil.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  // hasToken === null: masih hidrasi, belum tahu status login (lihat
  // use-auth-token.ts). hasToken === false: redirect ke /login sudah
  // dijadwalkan di efek atas. Dua-duanya tidak boleh merender isi halaman.
  if (hasToken !== true) return null;

  return (
    <div className="qhse-shell">
      <header className="qhse-shell__topbar">
        <Button
          className="qhse-shell__menu-button"
          variant="default"
          onClick={() => setDrawerOpen((open) => !open)}
          aria-expanded={drawerOpen}
          aria-controls="qhse-sidebar"
        >
          Menu
        </Button>
        <Link href="/dashboard" className="qhse-shell__brand">
          <span className="qhse-shell__brand-mark" aria-hidden="true">
            QH
          </span>
          <span className="qhse-shell__brand-text">
            QHSE Platform
            {/* Baris kedua menyebut PRODUKNYA, bukan nama tenant. Nama tenant
                sempat ditulis di sini dan itu keliru: token JWT hanya memuat
                tenant_id, tidak ada satu pun sumber nama tenant di sisi
                klien — jadi nama apa pun yang ditulis di sini adalah nama
                yang dikarang, dan akan salah untuk setiap tenant selain satu
                yang kebetulan dipakai saat menulisnya. Identitas tenant yang
                benar-benar diketahui sudah ditampilkan di sisi kanan topbar
                sebagai "Tenant <id>". */}
            <span className="qhse-shell__brand-sub">Mutu · K3 · Lingkungan</span>
          </span>
        </Link>
        <span className="qhse-shell__spacer" />
        {session && (
          // Yang ditampilkan email + tenant, BUKAN daftar peran: klaim
          // `scope_roles` di JWT selalu kosong by design (lihat SessionInfo
          // di lib/auth-session.ts), jadi menampilkannya akan berbunyi
          // "Tanpa peran" untuk SEMUA orang — keliru dan menyesatkan.
          <span className="qhse-shell__identity">
            <strong>{session.email ?? session.userId}</strong>
            <span className="qhse-shell__roles">Tenant {session.tenantId.slice(0, 8)}</span>
          </span>
        )}
        <ThemeToggle />
        <Button variant="default" onClick={handleLogout}>
          Keluar
        </Button>
      </header>

      <div className="qhse-shell__body">
        {drawerOpen && (
          <button
            type="button"
            className="qhse-shell__scrim"
            aria-label="Tutup menu"
            onClick={() => setDrawerOpen(false)}
          />
        )}

        <nav
          id="qhse-sidebar"
          className={`qhse-shell__sidebar${drawerOpen ? " qhse-shell__sidebar--open" : ""}`}
          aria-label="Navigasi modul"
        >
          {navGroups().map(({ group, items }) => (
            <div key={group} className="qhse-shell__nav-group">
              <h2 className="qhse-shell__nav-heading">{group}</h2>
              <ul className="qhse-shell__nav-list">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="qhse-shell__nav-link"
                      aria-current={pathname === item.href ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <main className="qhse-shell__main">{children}</main>
      </div>
    </div>
  );
}
