import { LibraryBrowser } from "@/components/library-browser";
import { LocalizedText } from "@/components/localized-text";
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
          <div className="section-kicker">
            <LocalizedText english="Imported Willing Ways Library" urdu="درآمد شدہ ولنگ ویز لائبریری" />
          </div>
          <h1 className="mt-4 text-5xl font-semibold leading-tight text-slate-950">
            <LocalizedText
              as="span"
              english="Browse the imported pages, treatments, articles, and media in one place."
              urdu="درآمد شدہ صفحات، treatments، articles اور media ایک ہی جگہ دیکھیں"
              englishClassName="font-serif"
              urduClassName="font-urdu text-right"
            />
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            <LocalizedText
              as="span"
              english="This index is generated from the live Willing Ways site and bundled into this app so staff, clients, and doctors can navigate the material without leaving the new experience."
              urdu="یہ index live Willing Ways site سے تیار کیا گیا ہے اور اسی app میں شامل ہے تاکہ staff، clients اور doctors نئے تجربے سے باہر گئے بغیر مواد دیکھ سکیں۔"
              urduClassName="font-urdu text-right"
            />
          </p>
          <div className="mt-4 text-sm text-slate-500">
            <LocalizedText
              english={`Last content sync: ${syncedAt}`}
              urdu={`آخری content sync: ${syncedAt}`}
              urduClassName="font-urdu text-right"
            />
          </div>
        </section>

        <section className="mt-10">
          <LibraryBrowser items={libraryIndex} />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
