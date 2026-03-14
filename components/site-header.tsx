"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, MessageSquareHeart, PhoneCall, X } from "lucide-react";
import { useState } from "react";

import { SITE_MEDIA } from "@/lib/site-assets";

import { SiteLanguageSwitcher } from "@/components/site-language-switcher";
import { useSiteLanguage } from "@/components/site-language-provider";

const navigation = [
  { href: "/", english: "Home", urdu: "ہوم" },
  { href: "/about-us", english: "About", urdu: "تعارف" },
  { href: "/our-services", english: "Services", urdu: "خدمات" },
  { href: "/treatments", english: "Treatments", urdu: "علاج" },
  { href: "/library", english: "Library", urdu: "لائبریری" },
  { href: "/contact-us", english: "Contact", urdu: "رابطہ" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { isUrdu } = useSiteLanguage();

  return (
    <header className="sticky top-0 z-40 border-b border-[#ead6dc] bg-[#fffaf8]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-[#ead6dc] bg-white shadow-soft sm:h-14 sm:w-14 sm:rounded-[22px]">
            <Image
              src={SITE_MEDIA.brandMark}
              alt="Willing Ways"
              width={80}
              height={80}
              className="h-8 w-8 object-contain sm:h-10 sm:w-10"
              unoptimized
            />
          </span>
          <span className="min-w-0">
            <span
              className={`block text-[10px] font-semibold tracking-[0.24em] text-primary sm:text-xs ${
                isUrdu ? "font-urdu text-right normal-case" : "uppercase"
              }`}
              dir={isUrdu ? "rtl" : "ltr"}
            >
              {isUrdu ? "ولنگ ویز پاکستان" : "Willing Ways Pakistan"}
            </span>
            <span
              className={`block text-base font-semibold leading-tight text-[#3b1725] sm:text-xl ${
                isUrdu ? "font-urdu text-right" : "font-serif"
              }`}
              dir={isUrdu ? "rtl" : "ltr"}
            >
              {isUrdu
                ? "نشے کے علاج اور ذہنی صحت کی بحالی"
                : "Addiction Treatment & Mental Health Rehabilitation"}
            </span>
            <span
              className={`mt-1 hidden text-sm text-[#714853] sm:block ${
                isUrdu ? "font-urdu text-right" : ""
              }`}
              dir={isUrdu ? "rtl" : "ltr"}
            >
              {isUrdu ? "لاہور، کراچی، اسلام آباد" : "Lahore, Karachi, Islamabad"}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-2 lg:flex">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className="site-nav-link">
              <span className={isUrdu ? "font-urdu" : ""} dir={isUrdu ? "rtl" : "ltr"}>
                {isUrdu ? item.urdu : item.english}
              </span>
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <SiteLanguageSwitcher />
          <a href="tel:+923007413639" className="site-action-link">
            <PhoneCall className="h-4 w-4" />
            0300 7413639
          </a>
          <Link href="/ai" className="site-cta-button">
            <MessageSquareHeart className="h-4 w-4" />
            <span className={isUrdu ? "font-urdu" : ""} dir={isUrdu ? "rtl" : "ltr"}>
              {isUrdu ? "ولنگ ویز اے آئی سے بات کریں" : "Talk to Willing Ways AI"}
            </span>
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex rounded-2xl border border-[#ead6dc] bg-white p-3 text-[#58323f] shadow-soft lg:hidden"
          onClick={() => setOpen((current) => !current)}
          aria-label="Toggle navigation"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-[#ead6dc] bg-[#fffaf8] lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 sm:px-6">
            <div className="rounded-[22px] border border-[#ead6dc] bg-white px-4 py-4 shadow-soft">
              <Image
                src={SITE_MEDIA.logo}
                alt="Willing Ways"
                width={340}
                height={80}
                className="h-10 w-auto object-contain"
                unoptimized
              />
            </div>
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl px-4 py-3 text-sm font-medium text-[#58323f] hover:bg-white"
                onClick={() => setOpen(false)}
              >
                <span className={isUrdu ? "font-urdu" : ""} dir={isUrdu ? "rtl" : "ltr"}>
                  {isUrdu ? item.urdu : item.english}
                </span>
              </Link>
            ))}
            <div className="pt-2">
              <SiteLanguageSwitcher />
            </div>
            <a href="tel:+923007413639" className="site-action-link justify-center">
              <PhoneCall className="h-4 w-4" />
              0300 7413639
            </a>
            <Link href="/ai" className="site-cta-button justify-center" onClick={() => setOpen(false)}>
              <MessageSquareHeart className="h-4 w-4" />
              <span className={isUrdu ? "font-urdu" : ""} dir={isUrdu ? "rtl" : "ltr"}>
                {isUrdu ? "ولنگ ویز اے آئی سے بات کریں" : "Talk to Willing Ways AI"}
              </span>
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
