"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHasAccessToken } from "../lib/use-auth-token";

// Root "/" tidak punya isi sendiri — hanya menyalurkan ke /dashboard (kalau
// sudah masuk) atau /login (kalau belum). Keputusan itu HARUS diambil di
// browser, bukan lewat `redirect()` server, karena penanda sesi yang dipakai
// apps/web adalah access token di sessionStorage (lihat api-client.ts) yang
// tidak terlihat dari server.
export default function Home() {
  const router = useRouter();
  const hasToken = useHasAccessToken();

  useEffect(() => {
    if (hasToken === null) return; // masih hidrasi, status login belum diketahui
    router.replace(hasToken ? "/dashboard" : "/login");
  }, [hasToken, router]);

  return null;
}
