import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dr. Zarak AI-Assisted Family Health Hub | ADHD & Mental Health Support",
  description: "Your personal AI-powered family health platform specializing in ADHD, anxiety, and comprehensive healthcare. Meet Dr. Zarak - evidence-based support with telehealth consultation, EHR integration, and predictive analytics powered by OpenAI's Realtime API",
  keywords: "mental health, ADHD, life coaching, AI therapy, Dr. Zarak, wellness, mindfulness, anxiety support, telehealth, family health, EHR, health dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-slate-950 text-slate-100 font-sans">
        {children}
      </body>
    </html>
  );
}
