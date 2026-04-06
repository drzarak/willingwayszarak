"use client";

import Link from "next/link";
import { LockKeyhole, PhoneCall } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

export function StaffDashboardAuth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      setError("Enter your staff email and password.");
      return;
    }

    setStatus("submitting");
    setError(null);

    try {
      const response = await fetch("/api/staff/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail, password: normalizedPassword }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "The staff account could not be verified.");
      }

      window.location.reload();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "The staff account could not be verified.",
      );
      setStatus("idle");
    }
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-6xl items-center px-4 py-8 sm:px-6">
      <div className="grid w-full gap-6 rounded-[36px] border border-slate-200 bg-white p-6 shadow-[0_28px_90px_rgba(15,23,42,0.08)] lg:grid-cols-[1.2fr_420px] lg:p-8">
        <div className="rounded-[30px] bg-[linear-gradient(160deg,#54111f_0%,#7f1d33_48%,#111827_100%)] p-6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] lg:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
            Internal use
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            Willing Ways follow-up desk
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78 sm:text-[15px]">
            Review new AI handoffs, assign owners, schedule callbacks, and keep family and
            aftercare follow-up from getting missed.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-white/10 bg-white/10 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                What this is for
              </div>
              <div className="mt-2 text-sm leading-6 text-white/80">
                Same-day callback queue, family coaching follow-through, relapse warning follow-up,
                and clean operational handoffs from the AI surfaces.
              </div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/10 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                Keep it safe
              </div>
              <div className="mt-2 text-sm leading-6 text-white/80">
                Use your own approved staff account on trusted devices. Do not leave the dashboard
                open in shared patient areas.
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-slate-50 p-5 sm:p-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold tracking-[-0.02em] text-slate-950">
            Staff sign-in
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Sign in with your approved Supabase staff account to open the internal follow-up
            dashboard. Your account must already have an active role in the Willing Ways staff
            directory.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Staff email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-slate-400"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={status === "submitting"}
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-slate-400"
                autoComplete="current-password"
                disabled={status === "submitting"}
                required
              />
            </label>

            {error ? (
              <div
                className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                role="alert"
              >
                {error}
              </div>
            ) : null}

            <Button
              type="submit"
              className="h-12 w-full rounded-2xl"
              disabled={status === "submitting"}
            >
              {status === "submitting" ? "Opening dashboard..." : "Open staff dashboard"}
            </Button>
          </form>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
            <Link href="/" className="site-inline-link">
              Back to AI home
            </Link>
            <a href="tel:+923357900295" className="site-inline-link">
              <PhoneCall className="h-4 w-4" />
              Dr Zarak Khan · +92 335 7900295
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
