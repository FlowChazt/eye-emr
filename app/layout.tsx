import type { Metadata } from "next";
import { Anuphan, Sarabun } from "next/font/google";
import "./globals.css";

const anuphan = Anuphan({
  subsets: ["thai", "latin"],
  variable: "--font-anuphan",
  weight: ["400", "500", "600", "700"],
});

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  variable: "--font-sarabun",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Eye Clinic EMR",
  description: "ระบบเวชระเบียนคลินิก Eye Clinic",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${anuphan.variable} ${sarabun.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
