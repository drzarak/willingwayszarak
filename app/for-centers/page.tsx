import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, FileText, Headphones, ShieldCheck, UsersRound } from "lucide-react";

import { SITE_MEDIA } from "@/lib/site-assets";
import {
  DR_ZARAK_LINKEDIN_URL,
  DR_ZARAK_NAME,
  DR_ZARAK_PHONE_DISPLAY,
  DR_ZARAK_PHONE_HREF,
  DR_ZARAK_WEBSITE_DISPLAY,
  DR_ZARAK_WEBSITE_URL,
} from "@/lib/site-contact";

const valueCards = [
  {
    title: "24/7 relapse support layer",
    body: "Patients and families get an always-available first response for cravings, denial, stress, and family conflict between human sessions.",
    icon: Headphones,
  },
  {
    title: "Doctor-ready briefs",
    body: "The AI captures structured presenting problems, risk flags, family context, follow-up windows, and next-step recommendations for staff review.",
    icon: FileText,
  },
  {
    title: "Admin visibility",
    body: "Leadership can review workload, open cases, service demand, urgent queues, branch demand, and estimated AI usage cost from one portal.",
    icon: BarChart3,
  },
  {
    title: "Family training engine",
    body: "Families receive practical scripts for denial, boundaries, enabling, intervention readiness, and follow-along support after treatment.",
    icon: UsersRound,
  },
];

export const metadata = {
  title: "For Rehab Centers | Willing Ways AI Counselor",
  description:
    "A voice-first AI clinical support layer for rehab centers, built for relapse prevention, family guidance, and doctor-ready documentation.",
};

export default function ForCentersPage() {
  return (
    <main className="min-h-[100dvh] bg-[linear-gradient(180deg,#f7f5ef_0%,#efe8dc_100%)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="site-action-link">
            Back to AI call
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link href="/staff" className="site-action-link">
              Staff desk
            </Link>
            <Link href="/staff/admin" className="site-action-link">
              Admin portal
            </Link>
          </div>
        </div>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
          <div className="rounded-[40px] border border-white/80 bg-white/95 p-6 shadow-[0_28px_90px_rgba(15,23,42,0.08)] sm:p-8 lg:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
              Clinical AI support layer
            </div>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-6xl">
              Turn every patient conversation into a calmer next step and a usable clinical brief.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
              Built for addiction and mental health centers that need more patient engagement,
              stronger family guidance, better documentation, and less after-hours staff overload.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/" className="site-cta-button">
                Open voice AI
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/book-session" className="site-secondary-button">
                Book clinical follow-up
              </Link>
            </div>
          </div>

          <div className="rounded-[40px] border border-white/80 bg-[#4d1122] p-6 text-white shadow-[0_28px_90px_rgba(77,17,34,0.18)] sm:p-8">
            <div className="flex items-center gap-3">
              <Image
                src={SITE_MEDIA.builder}
                alt={DR_ZARAK_NAME}
                width={96}
                height={96}
                className="h-20 w-20 rounded-[28px] border border-white/15 object-cover"
                priority
              />
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f3c6d2]">
                  Built by
                </div>
                <div className="mt-1 text-2xl font-semibold tracking-[-0.03em]">
                  {DR_ZARAK_NAME}
                </div>
                <a
                  href={DR_ZARAK_WEBSITE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex text-sm font-semibold text-[#f3c6d2] hover:text-white"
                >
                  {DR_ZARAK_WEBSITE_DISPLAY}
                </a>
              </div>
            </div>

            <div className="mt-7 rounded-[28px] border border-white/12 bg-white/8 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <ShieldCheck className="h-4 w-4 text-[#f3c6d2]" />
                Sales-ready outcome
              </div>
              <p className="mt-3 text-sm leading-7 text-[#f3e7ea]">
                If one prevented relapse covers the cost, ROI is achieved. The real question for a
                rehab center is how many patients it can afford to lose between sessions.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <a href={DR_ZARAK_PHONE_HREF} className="footer-pill">
                {DR_ZARAK_PHONE_DISPLAY}
              </a>
              <a
                href={DR_ZARAK_LINKEDIN_URL}
                target="_blank"
                rel="noreferrer"
                className="footer-pill"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {valueCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
                className="rounded-[30px] border border-white/80 bg-white/94 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-800">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-slate-950">
                  {card.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{card.body}</p>
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
