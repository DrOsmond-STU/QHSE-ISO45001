"use client";

import type { ReactNode } from "react";
import { LocaleProvider } from "../lib/locale";

// Pembungkus klien untuk seluruh aplikasi.
//
// Ada sebagai berkas tersendiri karena app/layout.tsx adalah server component
// dan harus tetap begitu — di sanalah <html>, metadata, dan tautan huruf
// dirender. Provider bahasa butuh state, jadi ia harus komponen klien; yang
// dipakai adalah pola biasa: server layout merender satu pembungkus klien
// tipis, dan pembungkus itu yang menyimpan state.
//
// Halaman masuk ikut terbungkus dengan sengaja: memilih bahasa SEBELUM masuk
// adalah keadaan pertama yang dialami pengguna berbahasa Inggris, dan
// pemilih bahasa yang baru muncul setelah berhasil masuk datang terlambat.
export function Providers({ children }: { children: ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}
