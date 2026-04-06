import Link from "next/link";

interface AuthErrorPageProps {
  searchParams?: Promise<{
    message?: string;
  }>;
}

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const message = (
    resolvedParams?.message ?? "Authentication could not be completed."
  ).trim();

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-3xl items-center px-4 py-10 sm:px-6">
      <section className="w-full rounded-[32px] border border-rose-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">
          Authentication error
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
          We could not complete sign-in
        </h1>
        <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-7 text-rose-700">
          {message}
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3 text-sm">
          <Link href="/login" className="site-inline-link">
            Go to login
          </Link>
          <Link href="/sign-up" className="site-inline-link">
            Create account
          </Link>
          <Link href="/" className="site-inline-link">
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
