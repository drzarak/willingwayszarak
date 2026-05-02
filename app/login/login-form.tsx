"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { FormEvent, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseAuthConfigured } from "@/lib/supabase/env";

import { Button } from "@/components/ui/button";

interface LoginFormProps {
  nextPath: string;
}

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const supabaseConfigured = isSupabaseAuthConfigured();

  async function handlePasswordSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabaseConfigured) {
      setError(
        "Supabase auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
      );
      return;
    }

    setStatus("submitting");
    setError("");
    setInfo("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        throw signInError;
      }

      router.replace(nextPath);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Sign-in failed.");
      setStatus("idle");
    }
  }

  async function handleMagicLinkSignIn() {
    if (!supabaseConfigured) {
      setError(
        "Supabase auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
      );
      return;
    }

    if (!email.trim()) {
      setError("Enter your email first, then request a magic link.");
      return;
    }

    setStatus("submitting");
    setError("");
    setInfo("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(
            nextPath,
          )}`,
        },
      });

      if (otpError) {
        throw otpError;
      }

      setInfo("Check your inbox for the secure sign-in link.");
      setStatus("idle");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Magic link could not be sent.",
      );
      setStatus("idle");
    }
  }

  return (
    <div id="main-content" className="mx-auto flex min-h-[100dvh] max-w-6xl items-center px-4 py-8 sm:px-6">
      <div className="grid w-full gap-6 rounded-[36px] border border-slate-200 bg-white p-6 shadow-[0_28px_90px_rgba(15,23,42,0.08)] lg:grid-cols-[1.15fr_420px] lg:p-8">
        <div className="rounded-[30px] bg-[linear-gradient(160deg,#111827_0%,#4f0f1f_55%,#0f172a_100%)] p-6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] lg:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
            Secure staff and clinician access
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            Sign in to Willing Ways operations
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78 sm:text-[15px]">
            Access role-based dashboards, follow-up queues, and protected workflows. Use
            your approved account to continue.
          </p>
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-slate-50 p-5 sm:p-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold tracking-[-0.02em] text-slate-950">
            Account sign-in
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Use your email and password. If needed, request a magic link.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handlePasswordSignIn}>
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

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-slate-400"
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
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <Button
            type="button"
            variant="outline"
            className="mt-3 h-12 w-full rounded-2xl"
            onClick={() => void handleMagicLinkSignIn()}
            disabled={status === "submitting"}
          >
            <Mail className="h-4 w-4" />
            Send magic link
          </Button>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
            <Link href="/sign-up" className="site-inline-link">
              Need a clinician account?
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
