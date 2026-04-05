import type { Metadata } from "next";
import { Rajdhani, Outfit } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import NavBar from "@/components/NavBar";
import "./globals.css";

const rajdhani = Rajdhani({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const outfit = Outfit({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ESEC — Engineering Knowledge Graph",
  description: "Mission control for mechanical design intelligence",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${rajdhani.variable} ${outfit.variable} ${geistMono.variable} h-full antialiased`}
      style={{ fontFamily: "var(--font-body), sans-serif" }}
    >
      <body
        className="min-h-screen flex flex-col"
        style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
      >
        <NavBar />
        <div className="flex-1 min-h-0">{children}</div>
      </body>
    </html>
  );
}
