import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "QHSE Enterprise Platform",
  description: "Bootstrap placeholder — app shell penuh dibangun di TASK_INSTRUCTION.md task 0.14.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
