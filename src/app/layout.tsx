import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SAU HR Portal", template: "%s | SAU HR Portal" },
  description: "Employee management for The Shaikh Ayaz University, Shikarpur.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#7b1a3a" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await headers(); // makes pages dynamic so the per-request CSP nonce (src/proxy.ts) applies
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
