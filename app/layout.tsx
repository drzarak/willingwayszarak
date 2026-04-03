import type { Metadata } from "next";
import { Manrope, Merriweather, Noto_Naskh_Arabic } from "next/font/google";

import { SITE_MEDIA } from "@/lib/site-assets";

import { SiteLanguageProvider } from "@/components/site-language-provider";

import "./globals.css";

const canonicalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.includes("willingways.uk")
  ? process.env.NEXT_PUBLIC_SITE_URL
  : "https://willingways.uk";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  preload: false,
  variable: "--font-merriweather",
});

const notoNaskhArabic = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-urdu",
});

export const metadata: Metadata = {
  metadataBase: new URL(canonicalSiteUrl),
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

const LEGACY_BROWSER_POLYFILLS = `
(function () {
  if (typeof globalThis.structuredClone !== "function") {
    globalThis.structuredClone = function (value) {
      return JSON.parse(JSON.stringify(value));
    };
  }

  if (
    typeof globalThis.TextDecoderStream !== "function" &&
    typeof globalThis.ReadableStream === "function" &&
    typeof globalThis.WritableStream === "function" &&
    typeof globalThis.TextDecoder === "function"
  ) {
    globalThis.TextDecoderStream = function TextDecoderStream(label, options) {
      const decoder = new TextDecoder(label, options);
      let controller;

      this.readable = new ReadableStream({
        start(streamController) {
          controller = streamController;
        },
      });

      this.writable = new WritableStream({
        write(chunk) {
          const text = decoder.decode(chunk, { stream: true });
          if (text) {
            controller.enqueue(text);
          }
        },
        close() {
          const text = decoder.decode();
          if (text) {
            controller.enqueue(text);
          }
          controller.close();
        },
        abort(reason) {
          if (controller) {
            controller.error(reason);
          }
        },
      });
    };
  }

  if (
    typeof globalThis.TextEncoderStream !== "function" &&
    typeof globalThis.ReadableStream === "function" &&
    typeof globalThis.WritableStream === "function" &&
    typeof globalThis.TextEncoder === "function"
  ) {
    globalThis.TextEncoderStream = function TextEncoderStream() {
      const encoder = new TextEncoder();
      let controller;

      this.readable = new ReadableStream({
        start(streamController) {
          controller = streamController;
        },
      });

      this.writable = new WritableStream({
        write(chunk) {
          const encoded = encoder.encode(String(chunk));
          if (encoded.byteLength > 0) {
            controller.enqueue(encoded);
          }
        },
        close() {
          controller.close();
        },
        abort(reason) {
          if (controller) {
            controller.error(reason);
          }
        },
      });
    };
  }
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          id="ww-legacy-browser-polyfills"
          dangerouslySetInnerHTML={{ __html: LEGACY_BROWSER_POLYFILLS }}
        />
      </head>
      <body
        className={`${manrope.variable} ${merriweather.variable} ${notoNaskhArabic.variable} font-sans antialiased`}
      >
        <SiteLanguageProvider>
          {children}
        </SiteLanguageProvider>
      </body>
    </html>
  );
}
