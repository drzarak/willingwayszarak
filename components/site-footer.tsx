import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

import { BRANCH_CONTACTS } from "@/lib/chat";

const footerLinks = [
  { href: "/about-us", label: "About" },
  { href: "/our-services", label: "Services" },
  { href: "/treatments", label: "Treatments" },
  { href: "/library", label: "Library" },
  { href: "/ai", label: "AI Assistant" },
  { href: "/contact-us", label: "Contact" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200/70 bg-slate-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr_1.2fr] lg:px-8">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200/70">
            Willing Ways Pakistan
          </div>
          <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight">
            Addiction treatment, psychiatric care, family guidance, and AI-assisted intake.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
            Built to support patients, families, referral partners, and clinical teams with clear
            pathways to treatment in Lahore, Karachi, and Islamabad.
          </p>
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
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200/70">
            Explore
          </div>
          <div className="mt-4 grid gap-2">
            {footerLinks.map((link) => (
              <Link key={link.href} href={link.href} className="footer-link">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200/70">
            Branches
          </div>
          <div className="mt-4 grid gap-4">
            {BRANCH_CONTACTS.map((branch) => (
              <div key={branch.name} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="font-semibold text-white">{branch.name}</div>
                <div className="mt-2 flex items-start gap-2 text-sm leading-6 text-slate-300">
                  <MapPin className="mt-1 h-4 w-4 shrink-0 text-sky-200/80" />
                  <span>{branch.address}</span>
                </div>
                <div className="mt-2 flex items-start gap-2 text-sm leading-6 text-slate-300">
                  <Phone className="mt-1 h-4 w-4 shrink-0 text-sky-200/80" />
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
