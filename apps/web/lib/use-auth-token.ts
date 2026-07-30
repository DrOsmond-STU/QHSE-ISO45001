"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "./api-client";

/**
 * `sessionStorage` cuma ada di browser — dibaca di `useEffect` (BUKAN
 * langsung saat render) supaya hasil server-render (SSR/prerender Next.js,
 * yang tidak py akses sessionStorage) dan client-render pertama SAMA
 * (`null`), menghindari hydration mismatch. `hasToken===null` di kode
 * pemanggil berarti "belum tahu" (render sekejap sebelum effect jalan),
 * bukan "pasti belum login".
 */
export function useHasAccessToken(): boolean | null {
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => {
    setHasToken(getAccessToken() !== null);
  }, []);

  return hasToken;
}
