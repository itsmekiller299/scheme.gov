import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/app/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "scheme.gov — AI Assist for Gov | Gemini 2.5",
  description: "AI Assist for Gov — 94 welfare schemes, Gemini 2.5 Flash grounded English chat, voice (en-IN), RAG + Vision doc check. Built for Google Gemini Hackathon.",
  openGraph: {
    title: "scheme.gov — AI Assist for Gov (Gemini 2.5)",
    description: "Ask in English (en-IN) — Gemini finds your eligible schemes, validates docs, guides apply. 94 schemes, voice, RAG.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col">{children}</div>
      </body>
    </html>
  );
}
