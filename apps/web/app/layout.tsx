import "./globals.css";
import "@qhse/ui-components/styles.css";
import type { Metadata } from "next";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "QHSE Platform — Petro Nusantara Sejahtera",
  description: "Sistem manajemen mutu, keselamatan, kesehatan kerja, dan lingkungan terintegrasi.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // lang="id" adalah nilai AWAL, bukan nilai tetap: LocaleProvider
    // memperbaruinya begitu pilihan bahasa pengguna dibaca. Dirender server
    // sebagai "id" karena pilihan itu tersimpan di peramban dan server tidak
    // bisa mengetahuinya tanpa cookie — dan menambah cookie hanya untuk
    // atribut ini bukan pertukaran yang sepadan.
    <html lang="id">
      <head>
        {/*
          Plus Jakarta Sans — huruf yang dipakai semestateknologiutama.com DAN
          pertamina.com (diukur dari lembar gaya keduanya, lihat banner
          packages/ui-components/src/tokens.css).

          Dimuat lewat <link>, BUKAN next/font/google. Yang kedua mengunduh
          berkas hurufnya saat BUILD, dan build itu berjalan di shared hosting
          yang sudah beberapa kali gagal karena batas memori dan jumlah proses.
          Menambahkan satu dependensi jaringan ke langkah build berarti
          menambah satu lagi cara agar situsnya gagal terpasang sama sekali.
          Lewat <link>, kegagalan terburuknya hanyalah huruf cadangan sistem —
          yang sudah didaftarkan di --qhse-font-ui.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
