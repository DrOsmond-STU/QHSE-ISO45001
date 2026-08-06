"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@qhse/ui-components";
import { logout, readSession, type SessionInfo } from "../../lib/auth-session";
import { modulesByGroup } from "../../lib/modules";
import { useLocale, type Locale } from "../../lib/locale";
import { useHasAccessToken } from "../../lib/use-auth-token";
import "./app-shell.css";

const THEME_KEY = "qhse.theme";

interface NavItem {
  href: string;
  label: string;
}

function navGroups(locale: Locale): Array<{ group: string; items: NavItem[] }> {
  const en = locale === "en";
  return [
    {
      group: en ? "Overview" : "Ringkasan",
      items: [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/executive", label: en ? "Executive Dashboard" : "Dashboard Eksekutif" },
        { href: "/analytics", label: en ? "Analytics" : "Analitik" },
        { href: "/scorecard", label: "Balanced Scorecard" },
        { href: "/ai", label: en ? "Search & Assistance" : "Pencarian & Bantuan" },
        { href: "/approvals", label: en ? "Approval Inbox" : "Kotak Persetujuan" },
      ],
    },
    ...modulesByGroup(locale).map(({ group, modules }) => ({
      group,
      items: modules.map((module) => ({ href: `/modules/${module.slug}`, label: module.title })),
    })),
    {
      group: en ? "Display Settings" : "Pengaturan Tampilan",
      items: [{ href: "/settings/dashboard", label: en ? "Executive Dashboard Layout" : "Susunan Dashboard Eksekutif" }],
    },
    {
      group: en ? "Account" : "Akun",
      items: [
        { href: "/notifications", label: en ? "Notifications" : "Notifikasi" },
        { href: "/notifications/preferences", label: en ? "Notification Preferences" : "Preferensi Notifikasi" },
      ],
    },
  ];
}

/**
 * Toggle tema eksplisit — DESIGN §3.6: pilihan user MENANG atas preferensi OS
 * di kedua arah, jadi yang disimpan bukan "dark: ya/tidak" melainkan atribut
 * `data-theme` yang di tokens.css punya blok override sendiri terhadap
 * `prefers-color-scheme`.
 *
 * BERUPA IKON, BUKAN TEKS. Tombol bertuliskan "Gelap" punya cacat yang tidak
 * bisa diperbaiki dengan memilih kata yang lebih baik: separuh pembaca
 * membacanya sebagai keadaan sekarang ("temanya sedang gelap") dan separuh
 * lagi sebagai perintah ("jadikan gelap") — dan keduanya masuk akal.
 * Ikon matahari/bulan tidak punya kekaburan itu, dan tidak perlu
 * diterjemahkan. Yang tetap ditulis adalah aria-label, karena pembaca layar
 * memang butuh kalimat.
 */
function ThemeToggle() {
  const { t } = useLocale();
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

  // Ikon yang ditampilkan adalah TUJUAN, bukan keadaan sekarang: saat tema
  // gelap sedang aktif yang tampil matahari, karena itulah yang akan terjadi
  // bila ditekan. Sama seperti tombol putar/jeda.
  const keGelap = theme !== "dark";

  return (
    <button
      type="button"
      className="qhse-shell__icon-button"
      onClick={toggle}
      aria-label={keGelap ? t("Beralih ke tema gelap", "Switch to dark theme") : t("Beralih ke tema terang", "Switch to light theme")}
      title={keGelap ? t("Tema gelap", "Dark theme") : t("Tema terang", "Light theme")}
    >
      {keGelap ? <IconBulan /> : <IconMatahari />}
    </button>
  );
}

function IconBulan() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path
        d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMatahari() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6" />
      </g>
    </svg>
  );
}

/**
 * Pemilih bahasa — dua tombol berdampingan, bukan menu tarik-turun.
 *
 * Dengan hanya dua pilihan, menu tarik-turun menuntut dua klik untuk
 * pekerjaan satu klik, dan menyembunyikan pilihan yang tidak aktif. Bentuk
 * ini memperlihatkan keduanya sekaligus dan memperlihatkan mana yang sedang
 * dipakai — persis yang ditanyakan orang saat mencarinya.
 */
function LanguageToggle() {
  const { locale, setLocale, t } = useLocale();
  return (
    <div className="qhse-shell__lang" role="group" aria-label={t("Bahasa antarmuka", "Interface language")}>
      {(["id", "en"] as Locale[]).map((kode) => (
        <button
          key={kode}
          type="button"
          className={`qhse-shell__lang-option${locale === kode ? " qhse-shell__lang-option--on" : ""}`}
          onClick={() => setLocale(kode)}
          aria-pressed={locale === kode}
          lang={kode}
        >
          {kode === "id" ? "ID" : "EN"}
        </button>
      ))}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hasToken = useHasAccessToken();
  const { locale, t } = useLocale();
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
          {t("Menu", "Menu")}
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
            <span className="qhse-shell__brand-sub">
              {t("Mutu · K3 · Lingkungan", "Quality · Safety · Environment")}
            </span>
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
        <LanguageToggle />
        <ThemeToggle />
        <Button variant="default" onClick={handleLogout}>
          {t("Keluar", "Sign out")}
        </Button>
      </header>

      <div className="qhse-shell__body">
        {drawerOpen && (
          <button
            type="button"
            className="qhse-shell__scrim"
            aria-label={t("Tutup menu", "Close menu")}
            onClick={() => setDrawerOpen(false)}
          />
        )}

        <nav
          id="qhse-sidebar"
          className={`qhse-shell__sidebar${drawerOpen ? " qhse-shell__sidebar--open" : ""}`}
          aria-label={t("Navigasi modul", "Module navigation")}
        >
          {navGroups(locale).map(({ group, items }) => (
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
