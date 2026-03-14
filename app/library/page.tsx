import { LibraryBrowser } from "@/components/library-browser";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { libraryIndex, siteGeneratedAt } from "@/lib/site-data";

export default function LibraryPage() {
  const syncedAt = new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(siteGeneratedAt));

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <section className="max-w-4xl">
          <div className="section-kicker">Imported Willing Ways Library</div>
          <h1 className="mt-4 font-serif text-5xl font-semibold leading-tight text-slate-950">
            Browse the imported pages, treatments, articles, and media in one place.
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            This index is generated from the live Willing Ways site and bundled into this app so
            staff, clients, and doctors can navigate the material without leaving the new
            experience.
          </p>
          <div className="mt-4 text-sm text-slate-500">Last content sync: {syncedAt}</div>
        </section>

        <section className="mt-10">
          <LibraryBrowser items={libraryIndex} />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
