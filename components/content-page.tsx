import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock3, MapPin, MessageSquareHeart, PhoneCall } from "lucide-react";

import { BRANCH_CONTACTS } from "@/lib/chat";
import { getPreferredPageImage, getRelatedPages, getSectionTitle, type SitePage } from "@/lib/site-data";

import { LocalizedText } from "@/components/localized-text";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SiteMarkdown } from "@/components/site-markdown";

interface ContentPageProps {
  page: SitePage;
}

function formatUpdatedDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function ContentPage({ page }: ContentPageProps) {
  const image = getPreferredPageImage(page);
  const updatedAt = formatUpdatedDate(page.updatedAt);
  const relatedPages = getRelatedPages(page, 5);
  const articleContent = page.markdown.replace(/^# .+\n+/, "");

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        <section className="border-b border-[#ead6dc] bg-white/70">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-16">
            <div>
              <div className="section-kicker">
                <LocalizedText
                  english={getSectionTitle(page)}
                  urdu={
                    getSectionTitle(page) === "Services"
                      ? "خدمات"
                      : getSectionTitle(page) === "Treatments"
                        ? "علاج"
                        : getSectionTitle(page) === "Article"
                          ? "مضمون"
                          : "ولنگ ویز"
                  }
                />
              </div>
              <h1 className="mt-4 max-w-4xl text-3xl font-semibold leading-tight text-[#3b1725] sm:text-5xl">
                {page.title}
              </h1>
              <p className="mt-5 max-w-3xl text-xl leading-9 text-[#5a3743]">{page.description}</p>

              <div className="mt-6 flex flex-wrap gap-3 text-sm text-[#7a5a64]">
                <span className="info-chip">
                  <Clock3 className="h-4 w-4" />
                  {page.readingMinutes} min read
                </span>
                {updatedAt ? <span className="info-chip">Updated {updatedAt}</span> : null}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <a href="tel:+923007413639" className="site-cta-button">
                  <PhoneCall className="h-4 w-4" />
                  <LocalizedText english="Call admissions" urdu="داخلے کے لئے کال کریں" />
                </a>
                <Link href="/ai" className="site-action-link">
                  <MessageSquareHeart className="h-4 w-4" />
                  <LocalizedText english="Ask Willing Ways AI" urdu="ولنگ ویز اے آئی سے پوچھیں" />
                </Link>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[36px] border border-[#ead6dc] bg-white shadow-soft">
              {image ? (
                <Image
                  src={image}
                  alt={page.title}
                  width={1200}
                  height={800}
                  className="h-full min-h-[280px] w-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full min-h-[280px] items-end bg-[radial-gradient(circle_at_top_left,_rgba(255,217,224,0.18),_transparent_35%),linear-gradient(135deg,_rgba(72,10,28,0.95),_rgba(101,19,40,0.92)_55%,_rgba(143,64,88,0.78))] p-8 text-white">
                  <div>
                    <div className="section-kicker border-white/20 bg-white/10 text-white/75">
                      Willing Ways
                    </div>
                    <div className="mt-4 text-3xl font-semibold leading-tight">{page.title}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8 lg:py-14">
          <article className="rounded-[32px] border border-[#ead6dc] bg-white px-6 py-7 shadow-soft sm:px-8 sm:py-9">
            <SiteMarkdown content={articleContent} />
          </article>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[30px] border border-[#ead6dc] bg-white p-6 shadow-soft">
              <div className="section-kicker">
                <LocalizedText english="Admissions" urdu="داخلہ" />
              </div>
              <div className="mt-4 text-2xl font-semibold text-[#3b1725]">
                <LocalizedText
                  english="Need immediate guidance?"
                  urdu="فوری رہنمائی درکار ہے؟"
                  urduClassName="font-urdu text-right"
                />
              </div>
              <p className="mt-3 text-base leading-8 text-[#5a3743]">
                <LocalizedText
                  as="span"
                  english="Speak to the intake team for rehab, psychiatric consultation, family intervention, or follow-up planning."
                  urdu="rehab، psychiatric consultation، family intervention یا follow-up planning کے لئے intake team سے بات کریں۔"
                  urduClassName="font-urdu text-right"
                />
              </p>
              <div className="mt-5 flex flex-col gap-3">
                <a href="tel:+923007413639" className="site-cta-button justify-center">
                  <PhoneCall className="h-4 w-4" />
                  0300 7413639
                </a>
                <Link href="/contact-us" className="site-action-link justify-center">
                  <LocalizedText english="Contact branches" urdu="برانچز سے رابطہ کریں" />
                </Link>
                <Link href="/ai" className="site-action-link justify-center">
                  <MessageSquareHeart className="h-4 w-4" />
                  <LocalizedText english="Ask the AI assistant" urdu="اے آئی معاون سے پوچھیں" />
                </Link>
              </div>
            </div>

            <div className="rounded-[30px] border border-[#ead6dc] bg-white p-6 shadow-soft">
              <div className="section-kicker">
                <LocalizedText english="Branches" urdu="برانچز" />
              </div>
              <div className="mt-4 space-y-4">
                {[BRANCH_CONTACTS[0], BRANCH_CONTACTS[1], BRANCH_CONTACTS[3]].map((branch) => (
                  <div key={branch.name} className="rounded-[22px] border border-[#ead6dc] bg-[#fff8fa] px-4 py-4">
                    <div className="font-semibold text-[#3b1725]">{branch.name}</div>
                    <div className="mt-2 flex items-start gap-2 text-sm leading-7 text-[#5a3743]">
                      <MapPin className="mt-1 h-4 w-4 shrink-0 text-primary" />
                      <span>{branch.address}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {relatedPages.length > 0 ? (
              <div className="rounded-[30px] border border-[#ead6dc] bg-white p-6 shadow-soft">
                <div className="section-kicker">
                  <LocalizedText english="Keep exploring" urdu="مزید دیکھیں" />
                </div>
                <div className="mt-4 space-y-3">
                  {relatedPages.map((entry) => (
                    <Link
                      key={entry.path}
                      href={entry.path}
                      className="group flex items-start justify-between gap-3 rounded-[22px] border border-[#ead6dc] bg-[#fff8fa] px-4 py-4 transition hover:border-primary/30 hover:bg-white"
                    >
                      <div>
                        <div className="font-semibold text-[#3b1725]">{entry.title}</div>
                        <div className="mt-1 text-sm leading-7 text-[#5a3743]">{entry.description}</div>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-primary" />
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
