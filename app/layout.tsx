import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });

export const metadata: Metadata = {
  title: "Mind - Dr. Zarak | ADHD & Mental Health Support",
  description: "Your personal AI mental health companion specializing in ADHD, anxiety, and life coaching. Meet Dr. Zarak - evidence-based support powered by OpenAI's Realtime API",
  keywords: "mental health, ADHD, life coaching, AI therapy, Dr. Zarak, wellness, mindfulness, anxiety support",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${manrope.className} antialiased bg-slate-950 text-slate-100`}>
        {children}
      </body>
    </html>
  );
}
