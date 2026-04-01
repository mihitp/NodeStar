import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ESEC — Engineering Knowledge Graph",
  description: "NPM for mechanical design",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
          <span className="font-bold text-lg">ESEC</span>
          <div className="flex gap-6">
            <a href="/qac" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
              QAC Console
            </a>
            <a href="/explore" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
              Graph Explorer
            </a>
            <a href="/workflows" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
              Workflows
            </a>
          </div>
        </nav>
        <div className="flex-1 min-h-0">{children}</div>
      </body>
    </html>
  );
}
