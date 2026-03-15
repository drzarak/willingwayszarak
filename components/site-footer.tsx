"use client";

import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

import { BRANCH_CONTACTS } from "@/lib/chat";
import { SITE_MEDIA } from "@/lib/site-assets";

import { useSiteLanguage } from "@/components/site-language-provider";

const footerLinks = [
  { href: "/about-us", english: "About", urdu: "تعارف" },
  { href: "/our-services", english: "Services", urdu: "خدمات" },
  { href: "/treatments", english: "Treatments", urdu: "علاج" },
  { href: "/library", english: "Library", urdu: "لائبریری" },
  { href: "/ai", english: "AI Assistant", urdu: "اے آئی معاون" },
  { href: "/contact-us", english: "Contact", urdu: "رابطہ" },
];

export function SiteFooter() {
  const { isUrdu } = useSiteLanguage();

  return (
    <footer className="border-t border-[#ead6dc] bg-[#4d1122] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr_1.2fr] lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <Image
              src={SITE_MEDIA.logo}
              alt="Willing Ways"
              width={320}
              height={90}
              className="h-10 w-auto object-contain"
              unoptimized
            />
          </div>
          <div
            className={`mt-4 text-xs font-semibold tracking-[0.24em] text-[#f3c6d2] ${
              isUrdu ? "font-urdu text-right normal-case" : "uppercase"
            }`}
            dir={isUrdu ? "rtl" : "ltr"}
          >
            {isUrdu ? "ولنگ ویز پاکستان" : "Willing Ways Pakistan"}
          </div>
          <h2
            className={`mt-4 text-3xl font-semibold leading-tight ${
              isUrdu ? "font-urdu text-right" : "font-serif"
            }`}
            dir={isUrdu ? "rtl" : "ltr"}
          >
            {isUrdu
              ? "نشے کا علاج، نفسیاتی نگہداشت، خاندانی رہنمائی اور اے آئی سے معاونت یافتہ داخلہ"
              : "Addiction treatment, psychiatric care, family guidance, and AI-assisted intake."}
          </h2>
          <p
            className={`mt-4 max-w-xl text-base leading-8 text-[#f3e7ea] ${
              isUrdu ? "font-urdu text-right" : ""
            }`}
            dir={isUrdu ? "rtl" : "ltr"}
          >
            {isUrdu
              ? "یہ ویب ایپ مریضوں، خاندانوں، ریفرل پارٹنرز اور کلینیکل ٹیموں کو لاہور، کراچی اور اسلام آباد میں علاج تک واضح رسائی دینے کے لئے بنائی گئی ہے۔"
              : "Built to support patients, families, referral partners, and clinical teams with clear pathways to treatment in Lahore, Karachi, and Islamabad."}
          </p>
          <div
            className={`mt-4 text-sm font-semibold text-[#f3c6d2] ${
              isUrdu ? "font-urdu text-right" : ""
            }`}
            dir={isUrdu ? "rtl" : "ltr"}
          >
            {isUrdu
              ? "یہ اے آئی ڈاکٹر زارک خان کی محبت سے تیار کی گئی ہے۔"
              : "This AI is built with love by Dr Zarak Khan."}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="tel:+923007413639" className="footer-pill">
              <Phone className="h-4 w-4" />
              0300 7413639
            </a>
            <a href="mailto:info@willingways.org" className="footer-pill">
              <Mail className="h-4 w-4" />
              info@willingways.org
            </a>
          </div>
        </div>

        <div>
          <div
            className={`text-xs font-semibold tracking-[0.24em] text-[#f3c6d2] ${
              isUrdu ? "font-urdu text-right normal-case" : "uppercase"
            }`}
            dir={isUrdu ? "rtl" : "ltr"}
          >
            {isUrdu ? "مزید دیکھیں" : "Explore"}
          </div>
          <div className="mt-4 grid gap-2">
            {footerLinks.map((link) => (
              <Link key={link.href} href={link.href} className="footer-link">
                <span className={isUrdu ? "font-urdu" : ""} dir={isUrdu ? "rtl" : "ltr"}>
                  {isUrdu ? link.urdu : link.english}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div
            className={`text-xs font-semibold tracking-[0.24em] text-[#f3c6d2] ${
              isUrdu ? "font-urdu text-right normal-case" : "uppercase"
            }`}
            dir={isUrdu ? "rtl" : "ltr"}
          >
            {isUrdu ? "برانچز" : "Branches"}
          </div>
          <div className="mt-4 grid gap-4">
            {BRANCH_CONTACTS.map((branch) => (
              <div key={branch.name} className="rounded-[24px] border border-white/12 bg-white/6 p-4">
                <div className={`font-semibold text-white ${isUrdu ? "font-urdu text-right" : ""}`}>
                  {branch.name}
                </div>
                <div className="mt-2 flex items-start gap-2 text-sm leading-6 text-[#f3e7ea]">
                  <MapPin className="mt-1 h-4 w-4 shrink-0 text-[#f3c6d2]" />
                  <span className={isUrdu ? "font-urdu text-right" : ""}>{branch.address}</span>
                </div>
                <div className="mt-2 flex items-start gap-2 text-sm leading-6 text-[#f3e7ea]">
                  <Phone className="mt-1 h-4 w-4 shrink-0 text-[#f3c6d2]" />
                  <span>{branch.phones.join(" • ")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
