import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  Brain,
  Building2,
  HeartHandshake,
  MessageSquareHeart,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react";

import { BRANCH_CONTACTS } from "@/lib/chat";
import { SITE_MEDIA } from "@/lib/site-assets";
import {
  featuredPages,
  latestArticles,
  siteMedia,
  treatmentTracks,
} from "@/lib/site-data";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const serviceCards = [
  {
    title: "Rehab Services",
    href: "/our-services/rehab-services",
    image: siteMedia.services.rehab,
    description:
      featuredPages.rehabServices?.description ??
      "Medically supervised detox and structured residential care for addiction recovery.",
    icon: ShieldCheck,
  },
  {
    title: "Counseling Services",
    href: "/our-services/counseling-services",
    image: siteMedia.services.counseling,
    description:
      featuredPages.counselingServices?.description ??
      "Core, supportive, personal development, situational, and family counseling pathways.",
    icon: HeartHandshake,
  },
  {
    title: "Psychiatric Services",
    href: "/our-services/psychiatric-services",
    image: siteMedia.services.psychiatric,
    description:
      featuredPages.psychiatricServices?.description ??
      "Psychiatric consultations, medication management, and crisis support with experienced clinicians.",
    icon: Stethoscope,
  },
];

const branchCards = [
  {
    name: "Lahore",
    href: "/about-us/our-branches/willingways-lahore",
    image: siteMedia.branches.lahore,
    details: BRANCH_CONTACTS[0],
  },
  {
    name: "Karachi",
    href: "/about-us/our-branches/willingways-karachi",
    image: siteMedia.branches.karachi,
    details: BRANCH_CONTACTS[1],
  },
  {
    name: "Islamabad",
    href: "/about-us/our-branches/willing-ways-islamabad",
    image: siteMedia.branches.islamabad,
    details: BRANCH_CONTACTS[3],
  },
];

const resourceCards = [
  { title: "FAQs", href: "/faqs", description: featuredPages.faq?.description },
  { title: "Publications", href: "/publications", description: featuredPages.publications?.description },
  { title: "Success Stories", href: "/success-stories", description: featuredPages.successStories?.description },
  { title: "Videos", href: "/videos", description: featuredPages.videos?.description },
  { title: "Treatment Costs", href: "/treatment-costs", description: featuredPages.costs?.description },
  { title: "You Asked For It", href: "/you-asked-for-it", description: featuredPages.youAskedForIt?.description },
];

export function HomePage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        <section className="overflow-hidden border-b border-[#ead6dc]">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10 lg:px-8 lg:py-16">
            <div className="relative">
              <div className="section-kicker">Pakistan’s Leading Rehabilitation Center</div>
              <h1 className="mt-5 max-w-4xl font-serif text-4xl font-semibold leading-[1.08] text-[#3b1725] sm:text-5xl lg:text-6xl">
                Addiction treatment, psychiatric care, and family guidance in one modern digital front door.
              </h1>
              <p className="mt-6 max-w-3xl text-xl leading-9 text-[#5a3743]">
                {featuredPages.home?.description ??
                  "Willing Ways is the most trusted addiction treatment and mental health rehabilitation center in Pakistan."}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a href="tel:+923007413639" className="site-cta-button">
                  <PhoneCall className="h-4 w-4" />
                  Call admissions
                </a>
                <Link href="/ai" className="site-action-link">
                  <MessageSquareHeart className="h-4 w-4" />
                  Start with AI intake
                </Link>
                <Link href="/contact-us" className="site-action-link">
                  Visit branches
                </Link>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {[
                  ["50+", "years of addiction treatment leadership"],
                  ["5000+", "clients supported across programs"],
                  ["24/7", "crisis and intake pathways"],
                ].map(([value, label]) => (
                  <div key={label} className="stat-card">
                    <div className="text-3xl font-semibold text-[#3b1725]">{value}</div>
                    <div className="mt-2 text-base leading-7 text-[#5a3743]">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5">
              <div className="overflow-hidden rounded-[34px] border border-[#ead6dc] bg-white shadow-soft">
                <div className="relative h-[240px] sm:h-[300px]">
                  <Image
                    src={SITE_MEDIA.facilities.islamabadCampus}
                    alt="Willing Ways Islamabad campus"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#4d1122]/82 via-[#4d1122]/32 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-6">
                    <div>
                      <div className="inline-flex rounded-full border border-white/16 bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/85">
                        Since 1975
                      </div>
                      <div className="mt-3 text-2xl font-semibold leading-tight text-white sm:text-3xl">
                        Trusted facilities for rehabilitation and psychiatric care.
                      </div>
                    </div>
                    <div className="hidden rounded-[22px] bg-white/10 p-3 backdrop-blur sm:block">
                      <Image
                        src={SITE_MEDIA.logo}
                        alt="Willing Ways"
                        width={220}
                        height={60}
                        className="h-12 w-auto object-contain"
                        unoptimized
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="hero-panel">
                <div className="section-kicker border-white/20 bg-white/10 text-white/80">Admissions first</div>
                <div className="mt-4 text-2xl font-semibold leading-tight text-white sm:text-3xl">
                  Built for patients, families, referral doctors, and clinical teams.
                </div>
                <div className="mt-5 grid gap-3">
                  {[
                    {
                      icon: HeartHandshake,
                      title: "Patient / Family",
                      description:
                        "Warm, guided support for admissions, intervention, relapse, and treatment questions.",
                    },
                    {
                      icon: Brain,
                      title: "Doctor / Clinical",
                      description:
                        "Structured intake assistance, treatment overview, and service navigation for referring clinicians.",
                    },
                    {
                      icon: Sparkles,
                      title: "AI + Human Team",
                      description:
                        "The AI assistant handles first contact while branch teams take over for assessment and scheduling.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="rounded-[24px] border border-white/12 bg-white/10 p-4">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex rounded-2xl bg-white/12 p-2.5">
                          <item.icon className="h-5 w-5 text-white" />
                        </span>
                        <div className="text-lg font-semibold text-white">{item.title}</div>
                      </div>
                      <p className="mt-3 text-base leading-8 text-white/82">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {BRANCH_CONTACTS.slice(0, 2).map((branch) => (
                  <div key={branch.name} className="rounded-[28px] border border-[#ead6dc] bg-white p-5 shadow-soft">
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                      {branch.name}
                    </div>
                    <div className="mt-3 text-base leading-8 text-[#5a3743]">{branch.address}</div>
                    <div className="mt-4 text-base font-semibold text-[#3b1725]">{branch.phones[0]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end sm:gap-6">
            <div>
              <div className="section-kicker">Services</div>
              <h2 className="mt-4 font-serif text-3xl font-semibold text-[#3b1725] sm:text-4xl">
                Treatment structure clients can actually understand.
              </h2>
            </div>
            <Link href="/our-services" className="site-inline-link">
              Explore all services
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {serviceCards.map((card) => (
              <Link key={card.href} href={card.href} className="service-card group">
                <Image
                  src={card.image}
                  alt={card.title}
                  width={1200}
                  height={900}
                  className="h-60 w-full object-cover"
                  unoptimized
                />
                <div className="space-y-4 p-6">
                  <div className="inline-flex rounded-2xl bg-primary/10 p-2.5 text-primary">
                    <card.icon className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-semibold text-[#3b1725]">{card.title}</div>
                  <p className="text-base leading-8 text-[#5a3743]">{card.description}</p>
                  <div className="site-inline-link">
                    Learn more
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-y border-[#ead6dc] bg-white/65">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end sm:gap-6">
              <div>
                <div className="section-kicker">Treatment Tracks</div>
                <h2 className="mt-4 font-serif text-3xl font-semibold text-[#3b1725] sm:text-4xl">
                  Imported from the live Willing Ways treatment library.
                </h2>
              </div>
              <Link href="/treatments" className="site-inline-link">
                View treatment pages
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
              {treatmentTracks.map((track) => (
                <Link key={track.href} href={track.href} className="rounded-[28px] border border-[#ead6dc] bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/30">
                  <Image
                    src={track.image}
                    alt={track.title}
                    width={256}
                    height={256}
                    className="h-16 w-16 object-contain"
                    unoptimized
                  />
                  <div className="mt-4 text-xl font-semibold text-[#3b1725]">{track.title}</div>
                  <p className="mt-3 text-base leading-8 text-[#5a3743]">{track.summary}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="rounded-[34px] border border-[#ead6dc] bg-white p-6 shadow-soft sm:p-8">
              <div className="mb-6 flex items-center gap-4">
                <Image
                  src={SITE_MEDIA.founder}
                  alt="Dr. Sadaqat Ali"
                  width={112}
                  height={112}
                  className="h-20 w-20 rounded-[24px] object-cover sm:h-24 sm:w-24"
                  unoptimized
                />
                <div>
                  <div className="section-kicker">Founder</div>
                  <div className="mt-3 text-2xl font-semibold text-[#3b1725]">Dr. Sadaqat Ali</div>
                </div>
              </div>
              <h2 className="mt-2 font-serif text-3xl font-semibold text-[#3b1725] sm:text-4xl">Dr. Sadaqat Ali’s treatment philosophy</h2>
              <p className="mt-5 text-lg leading-9 text-[#5a3743]">
                Addiction is treated here as a chronic, progressive condition rather than a moral
                failure. The emphasis is not only on stopping the substance, but on learning how to
                regulate mood, repair relationships, and build a recovery structure that can hold.
              </p>
              <p className="mt-4 text-lg leading-9 text-[#5a3743]">
                That makes the family part of treatment, not a bystander. The app now reflects
                that approach directly through branch routing, family-focused guidance, and the AI
                intake flow for both patient and doctor use cases.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/about-us" className="site-action-link">
                  About Willing Ways
                </Link>
                <Link href="/ai" className="site-action-link">
                  Ask a treatment question
                </Link>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {[
                { title: "Executives", image: siteMedia.teams.executives, href: "/about-us/our-team/executives" },
                { title: "Medical Specialists", image: siteMedia.teams.medical, href: "/about-us/our-team/medical-specialists" },
                { title: "Mental Health Care Specialists", image: siteMedia.teams.mentalHealth, href: "/about-us/our-team/mental-health-care-specialists" },
                { title: "Psychiatrists", image: siteMedia.teams.psychiatrists, href: "/about-us/our-team/psychiatrists" },
              ].map((team) => (
                <Link key={team.title} href={team.href} className="group overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-soft transition hover:-translate-y-0.5 hover:border-primary/30">
                  <Image
                    src={team.image}
                    alt={team.title}
                    width={1200}
                    height={900}
                    className="h-48 w-full object-cover"
                    unoptimized
                  />
                  <div className="p-5">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex rounded-2xl bg-primary/10 p-2.5 text-primary">
                        <Building2 className="h-5 w-5" />
                      </span>
                      <div className="text-lg font-semibold text-[#3b1725]">{team.title}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[#ead6dc] bg-white/65">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end sm:gap-6">
              <div>
                <div className="section-kicker">Branches</div>
                <h2 className="mt-4 font-serif text-3xl font-semibold text-[#3b1725] sm:text-4xl">
                  Admissions and treatment access across three major cities.
                </h2>
              </div>
              <Link href="/contact-us" className="site-inline-link">
                Full contact page
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              {branchCards.map((branch) => (
                <Link key={branch.name} href={branch.href} className="group overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-soft transition hover:-translate-y-0.5 hover:border-primary/30">
                  <Image
                    src={branch.image}
                    alt={branch.name}
                    width={1200}
                    height={900}
                    className="h-60 w-full object-cover"
                    unoptimized
                  />
                  <div className="space-y-3 p-6">
                    <div className="text-2xl font-semibold text-[#3b1725]">{branch.name}</div>
                    <div className="text-base leading-8 text-[#5a3743]">{branch.details.address}</div>
                    <div className="text-base font-semibold text-[#3b1725]">{branch.details.phones[0]}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="hero-panel">
              <div className="section-kicker border-white/20 bg-white/10 text-white/75">Willing Ways AI</div>
              <h2 className="mt-4 font-serif text-3xl font-semibold text-white sm:text-4xl">
                A dedicated intake assistant for patients, families, and doctors.
              </h2>
              <p className="mt-5 text-lg leading-9 text-white/86">
                The existing chat experience remains intact, but it now runs alongside the full
                site content, local media, and Willing Ways branch routing. Use it to guide
                consultations, interventions, or treatment-specific questions.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/ai" className="site-cta-button bg-white text-slate-950 hover:bg-slate-100">
                  <MessageSquareHeart className="h-4 w-4" />
                  Open AI assistant
                </Link>
                <Link href="/library" className="site-action-link border-white/20 bg-white/10 text-white hover:bg-white/16">
                  <BookOpenText className="h-4 w-4" />
                  Browse imported library
                </Link>
              </div>
              <div className="mt-6 overflow-hidden rounded-[24px] border border-white/12">
                <Image
                  src={SITE_MEDIA.facilities.karachiReception}
                  alt="Willing Ways facility interior"
                  width={1200}
                  height={800}
                  className="h-52 w-full object-cover"
                  unoptimized
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {resourceCards.map((card) => (
                <Link key={card.href} href={card.href} className="rounded-[28px] border border-[#ead6dc] bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/30">
                  <div className="inline-flex rounded-2xl bg-primary/10 p-2.5 text-primary">
                    <BookOpenText className="h-5 w-5" />
                  </div>
                  <div className="mt-4 text-xl font-semibold text-[#3b1725]">{card.title}</div>
                  <p className="mt-3 text-base leading-8 text-[#5a3743]">
                    {card.description ?? "Browse the imported Willing Ways material in a faster modern shell."}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-[#ead6dc] bg-white/65">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end sm:gap-6">
              <div>
                <div className="section-kicker">Latest Articles</div>
                <h2 className="mt-4 font-serif text-3xl font-semibold text-[#3b1725] sm:text-4xl">
                  Educational content imported into the new library.
                </h2>
              </div>
              <Link href="/library" className="site-inline-link">
                Open library
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {latestArticles.slice(0, 3).map((article) => (
                <Link
                  key={article.path}
                  href={article.path}
                  className="rounded-[30px] border border-slate-200/80 bg-white p-6 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/30"
                >
                  <div className="inline-flex rounded-2xl bg-primary/10 p-2.5 text-primary">
                    <BookOpenText className="h-5 w-5" />
                  </div>
                  <div className="mt-4 text-2xl font-semibold leading-tight text-[#3b1725]">{article.title}</div>
                  <p className="mt-4 text-base leading-8 text-[#5a3743]">{article.description}</p>
                  <div className="mt-5 site-inline-link">
                    Read article
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
