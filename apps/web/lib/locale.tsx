"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

// Pilihan bahasa antarmuka — Indonesia (bawaan) dan Inggris.
//
// KENAPA BUKAN /id/... DAN /en/... DI URL, cara yang lazim di Next.js:
//
// Rute berbahasa memindahkan bahasa ke dalam alamat, dan begitu ia ada di
// alamat, setiap tautan di seluruh aplikasi harus tahu bahasanya. Aplikasi ini
// punya satu rute dinamis yang melayani 19 modul beserta halaman detail dan
// tabel anaknya; menggandakan seluruhnya per bahasa berarti setiap tautan
// internal — termasuk yang dibangun dari data — harus dirakit ulang dengan
// awalan yang benar. Yang didapat sebagai gantinya adalah URL yang bisa
// dibagikan dalam bahasa tertentu, dan itu bukan kebutuhan aplikasi internal
// yang penggunanya masuk dengan akun.
//
// Yang dipakai di sini: satu pilihan per peramban, disimpan seperti tema.
// Konsekuensinya jujur — halaman yang dirender server tidak tahu bahasanya
// sampai JavaScript berjalan, jadi seluruh teks yang diterjemahkan berada di
// komponen klien. Itu memang keadaannya: shell, daftar, dan detail semuanya
// sudah client component karena butuh token sesi.

export type Locale = "id" | "en";

const LOCALE_KEY = "qhse.locale";

/**
 * Teks yang punya dua wujud. String biasa berarti SAMA di kedua bahasa —
 * dipakai untuk nomor, kode, dan istilah yang memang tidak diterjemahkan
 * (LTIFR, CAPA, HIRA), bukan sebagai jalan pintas untuk yang belum sempat
 * diterjemahkan.
 */
export type Teks = string | { id: string; en: string };

export function teks(value: Teks, locale: Locale): string {
  return typeof value === "string" ? value : value[locale];
}

interface LocaleValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  /** Pemendek untuk pasangan sebaris: `t("Simpan", "Save")`. */
  t: (id: string, en: string) => string;
  /** Menerjemahkan nilai bertipe Teks. */
  tx: (value: Teks) => string;
}

const LocaleContext = createContext<LocaleValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  // Bawaan "id" DAN TIDAK dibaca dari localStorage saat render pertama.
  // Membacanya langsung membuat render server (yang selalu "id") berbeda dari
  // render klien pertama, dan React membuang seluruh pohonnya dengan
  // peringatan hidrasi. Pilihan tersimpan dipasang pada efek di bawah.
  const [locale, setLocaleState] = useState<Locale>("id");

  useEffect(() => {
    const stored = window.localStorage.getItem(LOCALE_KEY);
    if (stored === "id" || stored === "en") setLocaleState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(LOCALE_KEY, next);
  }, []);

  const value = useMemo<LocaleValue>(
    () => ({
      locale,
      setLocale,
      t: (id: string, en: string) => (locale === "en" ? en : id),
      tx: (value: Teks) => teks(value, locale),
    }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleValue {
  const value = useContext(LocaleContext);
  // Melempar, bukan mengembalikan bawaan diam-diam: komponen yang lupa
  // dibungkus provider akan tampil berbahasa Indonesia selamanya tanpa ada
  // yang menyadarinya, dan itu jenis kegagalan yang baru ketahuan dari
  // keluhan pengguna.
  if (!value) throw new Error("useLocale dipakai di luar LocaleProvider.");
  return value;
}

/** Format tanggal dan angka mengikuti bahasa yang sedang dipakai. */
export function localeTag(locale: Locale): string {
  return locale === "en" ? "en-GB" : "id-ID";
}
