import type { Metadata } from "next";
import { Manrope, Merriweather } from "next/font/google";

import { SITE_MEDIA } from "@/lib/site-assets";

import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-merriweather",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://drzarak.org"),
  title: {
    default: "Willing Ways Pakistan",
    template: "%s | Willing Ways Pakistan",
  },
  description:
    "Willing Ways Pakistan offers addiction treatment, rehabilitation, psychiatric care, family intervention, and AI-assisted intake support.",
  icons: {
    icon: SITE_MEDIA.favicon,
    shortcut: SITE_MEDIA.favicon,
    apple: SITE_MEDIA.favicon,
  },
  openGraph: {
    title: "Willing Ways Pakistan",
    description:
      "Addiction treatment, rehabilitation, psychiatric care, family intervention, and AI-assisted intake support.",
    images: [{ url: SITE_MEDIA.logo }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${merriweather.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
