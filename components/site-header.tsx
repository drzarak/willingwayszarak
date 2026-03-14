"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, MessageSquareHeart, PhoneCall, X } from "lucide-react";
import { useState } from "react";

import { SITE_MEDIA } from "@/lib/site-assets";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/about-us", label: "About" },
  { href: "/our-services", label: "Services" },
  { href: "/treatments", label: "Treatments" },
  { href: "/library", label: "Library" },
  { href: "/contact-us", label: "Contact" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-slate-200 bg-white shadow-soft">
            <Image
              src={SITE_MEDIA.logo}
              alt="Willing Ways"
              width={80}
              height={80}
              className="h-10 w-auto object-contain"
              unoptimized
            />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Willing Ways Pakistan
            </span>
            <span className="block truncate font-serif text-lg font-semibold text-slate-950 sm:text-xl">
              Addiction Treatment & Mental Health Rehabilitation
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-2 lg:flex">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className="site-nav-link">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <a href="tel:+923007413639" className="site-action-link">
            <PhoneCall className="h-4 w-4" />
            0300 7413639
          </a>
          <Link href="/ai" className="site-cta-button">
            <MessageSquareHeart className="h-4 w-4" />
            Talk to Willing Ways AI
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 shadow-soft lg:hidden"
          onClick={() => setOpen((current) => !current)}
          aria-label="Toggle navigation"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-slate-200/70 bg-white lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 sm:px-6">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <a href="tel:+923007413639" className="site-action-link justify-center">
              <PhoneCall className="h-4 w-4" />
              0300 7413639
            </a>
            <Link href="/ai" className="site-cta-button justify-center" onClick={() => setOpen(false)}>
              <MessageSquareHeart className="h-4 w-4" />
              Talk to Willing Ways AI
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
