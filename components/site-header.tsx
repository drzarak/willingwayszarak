"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[#e6d8db] bg-white/96 shadow-sm backdrop-blur-xl">
      <div className="hidden border-b border-[#531120] bg-[#651328] text-white md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/90">
            {isUrdu
              ? "پاکستان میں نشے اور نفسیاتی علاج کے معتبر مراکز"
              : "The Best Addiction & Psychiatric Treatment Centers in Pakistan"}
          </p>
          <a
            href="tel:+923007413639"
            className="inline-flex rounded-full border border-white/35 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            0300 7413639
          </a>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="min-w-0 shrink-0">
          <Image
            src={SITE_MEDIA.logo}
            alt="Willing Ways"
            width={360}
            height={88}
            className="h-11 w-auto max-w-[210px] object-contain sm:h-14 sm:max-w-[280px]"
            unoptimized
            priority
          />
          <span
            className={`mt-1 hidden text-[11px] font-semibold tracking-[0.18em] text-[#8a4b5d] sm:block ${
              isUrdu ? "font-urdu text-right normal-case" : "uppercase"
            }`}
            dir={isUrdu ? "rtl" : "ltr"}
          >
            {isUrdu ? "لاہور • کراچی • اسلام آباد" : "Lahore • Karachi • Islamabad"}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 xl:flex">
          {navigation.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`site-nav-link ${
                  isActive ? "bg-[#6b1730] text-white hover:bg-[#5b1127] hover:text-white" : ""
                }`}
              >
                <span className={isUrdu ? "font-urdu" : ""} dir={isUrdu ? "rtl" : "ltr"}>
                  {isUrdu ? item.urdu : item.english}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 xl:flex">
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
          className="inline-flex rounded-2xl border border-[#ead6dc] bg-white p-3 text-[#58323f] shadow-soft xl:hidden"
          onClick={() => setOpen((current) => !current)}
          aria-label="Toggle navigation"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-[#ead6dc] bg-[#fffaf8] xl:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 sm:px-6">
            <div className="rounded-[22px] border border-[#ead6dc] bg-white px-4 py-4 shadow-soft">
              <Image
                src={SITE_MEDIA.logo}
                alt="Willing Ways"
                width={340}
                height={80}
                className="h-11 w-auto object-contain"
                unoptimized
              />
              <div
                className={`mt-2 text-[11px] font-semibold tracking-[0.18em] text-[#8a4b5d] ${
                  isUrdu ? "font-urdu text-right normal-case" : "uppercase"
                }`}
                dir={isUrdu ? "rtl" : "ltr"}
              >
                {isUrdu ? "لاہور • کراچی • اسلام آباد" : "Lahore • Karachi • Islamabad"}
              </div>
            </div>
            {navigation.map((item) => {
              const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                    isActive ? "bg-[#651328] text-white" : "text-[#58323f] hover:bg-white"
                  }`}
                  onClick={() => setOpen(false)}
                >
                  <span className={isUrdu ? "font-urdu" : ""} dir={isUrdu ? "rtl" : "ltr"}>
                    {isUrdu ? item.urdu : item.english}
                  </span>
                </Link>
              );
            })}
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
