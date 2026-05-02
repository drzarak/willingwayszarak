import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main id="main-content" className="mx-auto flex max-w-4xl flex-col items-center px-4 py-24 text-center sm:px-6 lg:px-8">
        <div className="section-kicker">Not found</div>
        <h1 className="mt-4 font-serif text-5xl font-semibold text-slate-950">
          This Willing Ways page is not available in the new app yet.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
          Use the library to browse imported content or open the AI assistant for help finding the
          right treatment, service, or branch.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/library" className="site-cta-button">
            Browse library
          </Link>
          <Link href="/" className="site-action-link">
            Open AI assistant
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
