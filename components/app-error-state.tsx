"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ExternalLink, PhoneCall, RefreshCcw } from "lucide-react";

import {
  DR_ZARAK_LINKEDIN_URL,
  DR_ZARAK_NAME,
  DR_ZARAK_PHONE_DISPLAY,
  DR_ZARAK_PHONE_HREF,
  WILLING_WAYS_HELPLINE_DISPLAY,
  WILLING_WAYS_HELPLINE_HREF,
} from "@/lib/site-contact";
import { SITE_MEDIA } from "@/lib/site-assets";

import { Button } from "@/components/ui/button";

interface AppErrorStateProps {
  message: string;
  title: string;
  onRetry?: () => void;
  primaryHref?: string;
  primaryLabel?: string;
}

export function AppErrorState({
  message,
  onRetry,
  primaryHref = "/",
  primaryLabel = "Back to the AI call",
  title,
}: AppErrorStateProps) {
  return (
    <div className="min-h-screen bg-[#f4f4f1] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[84vh] max-w-3xl items-center justify-center">
        <div className="w-full rounded-[32px] border border-black/5 bg-white/92 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:p-8">
          <Image
            src={SITE_MEDIA.logo}
            alt="Willing Ways"
            width={320}
            height={80}
            className="h-11 w-auto object-contain"
            unoptimized
            priority
          />

          <div className="mt-6 inline-flex h-12 w-12 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700">
            <AlertTriangle className="h-5 w-5" />
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
          <p className="mt-3 text-base leading-8 text-slate-600">{message}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            {onRetry ? (
              <Button type="button" onClick={onRetry}>
                <RefreshCcw className="h-4 w-4" />
                Try again
              </Button>
            ) : null}

            <Link href={primaryHref} className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              <PhoneCall className="h-4 w-4" />
              {primaryLabel}
            </Link>

            <a
              href={WILLING_WAYS_HELPLINE_HREF}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <PhoneCall className="h-4 w-4" />
              {WILLING_WAYS_HELPLINE_DISPLAY}
            </a>
          </div>

          <div className="mt-8 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
            If this is urgent, call 1122 or the Willing Ways helpline immediately. For product support, contact {DR_ZARAK_NAME} at {DR_ZARAK_PHONE_DISPLAY}.
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
            <a href={DR_ZARAK_PHONE_HREF} className="inline-flex items-center gap-2 transition hover:text-slate-900">
              <PhoneCall className="h-4 w-4" />
              {DR_ZARAK_NAME}
            </a>
            <a
              href={DR_ZARAK_LINKEDIN_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 transition hover:text-slate-900"
            >
              <ExternalLink className="h-4 w-4" />
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
