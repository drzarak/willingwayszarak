"use client";

import Link from "next/link";
import { LoaderCircle, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { BOOKING_BRANCH_OPTIONS, BOOKING_LANGUAGE_OPTIONS } from "@/lib/booking";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseAuthConfigured } from "@/lib/supabase/env";

interface SignUpFormProps {
  nextPath: string;
}

export function SignUpForm({ nextPath }: SignUpFormProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [requestedRole, setRequestedRole] = useState<"doctor" | "counselor" | "staff">(
    "counselor",
  );
  const [requestedBranch, setRequestedBranch] = useState("lahore");
  const [preferredLanguage, setPreferredLanguage] = useState<
    "english" | "urdu" | "punjabi" | "no_preference"
  >("english");
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const supabaseConfigured = isSupabaseAuthConfigured();

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabaseConfigured) {
      setError(
        "Supabase auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!fullName.trim()) {
      setError("Enter your full name so the admin team can review your request.");
      return;
    }

    setStatus("submitting");
    setError("");
    setInfo("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(
            nextPath,
          )}`,
          data: {
            full_name: fullName.trim(),
            preferred_language: preferredLanguage,
            requested_role: requestedRole,
            requested_branch_code: requestedBranch,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      setInfo(
        "Account request created. Confirm your email first. A Willing Ways admin will activate your role after review.",
      );
      setStatus("idle");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Sign-up failed. Please try again.",
      );
      setStatus("idle");
    }
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-6xl items-center px-4 py-8 sm:px-6">
      <div className="grid w-full gap-6 rounded-[36px] border border-slate-200 bg-white p-6 shadow-[0_28px_90px_rgba(15,23,42,0.08)] lg:grid-cols-[1.15fr_420px] lg:p-8">
        <div className="rounded-[30px] bg-[linear-gradient(160deg,#111827_0%,#4f0f1f_55%,#0f172a_100%)] p-6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] lg:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
            Invite-based account onboarding
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            Request clinician portal access
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78 sm:text-[15px]">
            Doctors, counselors, and approved staff can request access here. Confirm your
            email first, then the admin team can activate the correct role and branch.
          </p>
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-slate-50 p-5 sm:p-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <UserPlus className="h-5 w-5" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold tracking-[-0.02em] text-slate-950">
            Create account
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This creates a pending account request. Access is activated after Willing Ways
            reviews your role and branch.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSignUp}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Full name</span>
              <input
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-slate-400"
                placeholder="Dr Sadaqat Ali"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-slate-400"
                placeholder="name@willingways.uk"
                required
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Request access as
                </span>
                <select
                  value={requestedRole}
                  onChange={(event) =>
                    setRequestedRole(event.target.value as "doctor" | "counselor" | "staff")
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-slate-400"
                >
                  <option value="doctor">Doctor</option>
                  <option value="counselor">Counselor</option>
                  <option value="staff">Staff / coordinator</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Preferred branch
                </span>
                <select
                  value={requestedBranch}
                  onChange={(event) => setRequestedBranch(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-slate-400"
                >
                  {BOOKING_BRANCH_OPTIONS.filter((option) => option.id !== "first-available").map(
                    (option) => (
                      <option key={option.id} value={option.id}>
                        {option.english}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Preferred language
              </span>
              <select
                value={preferredLanguage}
                onChange={(event) =>
                  setPreferredLanguage(
                    event.target.value as "english" | "urdu" | "punjabi" | "no_preference",
                  )
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-slate-400"
              >
                {BOOKING_LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id === "no-preference" ? "no_preference" : option.id}>
                    {option.english}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-slate-400"
                minLength={8}
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Confirm password
              </span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-slate-400"
                minLength={8}
                required
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {info ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {info}
              </div>
            ) : null}

            <Button
              type="submit"
              className="h-12 w-full rounded-2xl"
              disabled={status === "submitting"}
            >
              {status === "submitting" ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
            <Link href="/login" className="site-inline-link">
              Already have an account?
            </Link>
            <Link href="/" className="site-inline-link">
              Back to AI home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
