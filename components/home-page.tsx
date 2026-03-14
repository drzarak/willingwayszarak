import Image from "next/image";
import Link from "next/link";
import {
  Brain,
  CheckCircle2,
  HeartHandshake,
  MessageSquareHeart,
  Mic,
  PhoneCall,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

import { BRANCH_CONTACTS } from "@/lib/chat";
import { SITE_MEDIA } from "@/lib/site-assets";
import { treatmentTracks } from "@/lib/site-data";

import { LocalizedText } from "@/components/localized-text";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const serviceCards = [
  {
    title: { english: "Rehab Services", urdu: "ریحاب خدمات" },
    description: {
      english:
        "Medically supervised detox, residential treatment, structured recovery planning, and ongoing support.",
      urdu:
        "میڈیکلی سپروائزڈ detox، رہائشی علاج، منظم recovery planning اور مسلسل سپورٹ۔",
    },
    href: "/our-services/rehab-services",
    image: SITE_MEDIA.services.rehab,
    icon: ShieldCheck,
  },
  {
    title: { english: "Counseling Services", urdu: "کاؤنسلنگ خدمات" },
    description: {
      english:
        "Core, supportive, family, situational, and follow-up counseling for patients and loved ones.",
      urdu:
        "مریضوں اور خاندانوں کے لئے core، supportive، family، situational اور follow-up counseling۔",
    },
    href: "/our-services/counseling-services",
    image: SITE_MEDIA.services.counseling,
    icon: HeartHandshake,
  },
  {
    title: { english: "Psychiatric Services", urdu: "نفسیاتی خدمات" },
    description: {
      english:
        "Psychiatric assessments, medication management, crisis support, and treatment planning.",
      urdu:
        "نفسیاتی assessment، medication management، crisis support اور treatment planning۔",
    },
    href: "/our-services/psychiatric-services",
    image: SITE_MEDIA.services.psychiatric,
    icon: Stethoscope,
  },
];

const visibleServices = [
  {
    english: "Admissions guidance for patients and families",
    urdu: "مریضوں اور خاندانوں کے لئے داخلے کی رہنمائی",
  },
  {
    english: "Drug addiction and alcoholism treatment",
    urdu: "منشیات اور الکحل کے علاج کے پروگرام",
  },
  {
    english: "Psychiatric care and medication review",
    urdu: "نفسیاتی نگہداشت اور ادویات کا جائزہ",
  },
  {
    english: "Family intervention and co-dependency support",
    urdu: "فیملی intervention اور co-dependency سپورٹ",
  },
  {
    english: "Relapse prevention and follow-up care",
    urdu: "relapse prevention اور follow-up care",
  },
  {
    english: "Doctor referral support and clinical navigation",
    urdu: "ڈاکٹر referral support اور clinical navigation",
  },
];

const conditions = [
  {
    english: "Drug addiction, ICE, and alcoholism",
    urdu: "منشیات، آئس اور الکحل کی لت",
  },
  {
    english: "Depression, anxiety, OCD, and bipolar disorder",
    urdu: "ڈپریشن، اینگزائٹی، OCD اور bipolar disorder",
  },
  {
    english: "ADHD, PTSD, schizophrenia, and behavioral disorders",
    urdu: "ADHD، PTSD، schizophrenia اور behavioral disorders",
  },
  {
    english: "Marital conflict, grief, stress, and anger issues",
    urdu: "ازدواجی تنازع، grief، stress اور anger issues",
  },
];

const treatmentTrackTranslations: Record<
  string,
  { summaryUrdu: string; titleUrdu: string }
> = {
  "Core Counseling": {
    titleUrdu: "کور کاؤنسلنگ",
    summaryUrdu:
      "addiction، alcoholism، OCD، ADHD، PTSD، schizophrenia اور related behavioral conditions پر رہنمائی۔",
  },
  "Supportive Counseling": {
    titleUrdu: "سپورٹو کاؤنسلنگ",
    summaryUrdu:
      "cravings management، denial management، emotional regulation اور relapse support کی عملی تربیت۔",
  },
  "Personal Development": {
    titleUrdu: "ذاتی نشوونما",
    summaryUrdu:
      "communication، emotional intelligence، discipline، resilience اور بہتر زندگی کی ترقی۔",
  },
  "Situational Counseling": {
    titleUrdu: "سیچویشنل کاؤنسلنگ",
    summaryUrdu:
      "crisis intervention، family intervention اور resistant patient situations میں منظم مدد۔",
  },
  "Follow-Up Care": {
    titleUrdu: "فالو اپ نگہداشت",
    summaryUrdu:
      "relapse prevention، continuing care اور discharge کے بعد long-term support۔",
  },
};

export function HomePage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        <section className="border-b border-[#ead6dc]">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10 lg:px-8 lg:py-14">
            <div className="space-y-6">
              <div className="section-kicker">
                <LocalizedText
                  english="Willing Ways Pakistan"
                  urdu="ولنگ ویز پاکستان"
                />
              </div>

              <h1 className="max-w-4xl text-4xl font-semibold leading-[1.08] text-[#3b1725] sm:text-5xl lg:text-6xl">
                <LocalizedText
                  as="span"
                  className="block"
                  english="Simple, clear access to addiction treatment, psychiatric care, and family help."
                  urdu="نشے کے علاج، نفسیاتی نگہداشت اور خاندانی مدد تک سادہ اور واضح رسائی"
                  urduClassName="font-urdu text-right"
                />
              </h1>

              <p className="max-w-3xl text-xl leading-9 text-[#5a3743]">
                <LocalizedText
                  as="span"
                  english="Use the website to understand services, branches, and treatment tracks. Use the AI assistant for intake questions, Urdu support, and realtime voice guidance."
                  urdu="ویب سائٹ کے ذریعے خدمات، برانچز اور علاج کے مراحل سمجھیں۔ داخلے کے سوالات، اردو سپورٹ اور realtime voice guidance کے لئے اے آئی معاون استعمال کریں۔"
                  urduClassName="font-urdu text-right"
                />
              </p>

              <div className="flex flex-wrap gap-3">
                <a href="tel:+923007413639" className="site-cta-button">
                  <PhoneCall className="h-4 w-4" />
                  <LocalizedText english="Call admissions" urdu="داخلے کے لئے کال کریں" />
                </a>
                <Link href="/ai" className="site-action-link">
                  <MessageSquareHeart className="h-4 w-4" />
                  <LocalizedText english="Open AI assistant" urdu="اے آئی معاون کھولیں" />
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  {
                    value: "50+",
                    english: "years of addiction treatment leadership",
                    urdu: "سالہ علاجی قیادت",
                  },
                  {
                    value: "5,000+",
                    english: "clients supported",
                    urdu: "کلائنٹس کی مدد",
                  },
                  {
                    value: "24/7",
                    english: "help pathways available",
                    urdu: "مدد کے راستے دستیاب",
                  },
                ].map((item) => (
                  <div key={item.english} className="stat-card">
                    <div className="text-3xl font-semibold text-[#3b1725]">{item.value}</div>
                    <div className="mt-2 text-base leading-7 text-[#5a3743]">
                      <LocalizedText english={item.english} urdu={item.urdu} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-[30px] border border-[#ead6dc] bg-white p-5 shadow-soft">
                <div className="flex items-center gap-3">
                  <span className="inline-flex rounded-2xl bg-primary/10 p-2.5 text-primary">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <div className="text-lg font-semibold text-[#3b1725]">
                    <LocalizedText english="Services provided" urdu="فراہم کردہ خدمات" />
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {visibleServices.map((service) => (
                    <div
                      key={service.english}
                      className="flex items-start gap-3 rounded-[22px] border border-[#ead6dc] bg-[#fff8fa] px-4 py-4"
                    >
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <LocalizedText
                        as="div"
                        className="text-base leading-7 text-[#5a3743]"
                        english={service.english}
                        urdu={service.urdu}
                        urduClassName="font-urdu text-right"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-5">
              <div className="overflow-hidden rounded-[34px] border border-[#ead6dc] bg-white shadow-soft">
                <div className="relative h-[280px] sm:h-[360px]">
                  <Image
                    src={SITE_MEDIA.facilities.islamabadCampus}
                    alt="Willing Ways Islamabad campus"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#4d1122]/86 via-[#4d1122]/26 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                    <div className="inline-flex rounded-full border border-white/18 bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/85">
                      <LocalizedText english="Official Willing Ways Facility" urdu="ولنگ ویز کی آفیشل سہولت" />
                    </div>
                    <div className="mt-3 max-w-xl text-2xl font-semibold leading-tight text-white sm:text-3xl">
                      <LocalizedText
                        english="Professional rehabilitation facilities for patients, families, and doctors."
                        urdu="مریضوں، خاندانوں اور ڈاکٹروں کے لئے پیشہ ور rehabilitation سہولیات"
                        urduClassName="font-urdu text-right"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="hero-panel">
                <div className="flex items-center gap-3">
                  <Image
                    src={SITE_MEDIA.logo}
                    alt="Willing Ways"
                    width={220}
                    height={60}
                    className="h-10 w-auto object-contain"
                    unoptimized
                  />
                </div>

                <div className="mt-5 grid gap-3">
                  {[
                    {
                      icon: HeartHandshake,
                      english: "Patient and family guidance in English and Urdu",
                      urdu: "انگریزی اور اردو میں مریض اور خاندان کی رہنمائی",
                    },
                    {
                      icon: Brain,
                      english: "Doctor mode for more structured clinical context",
                      urdu: "زیادہ منظم کلینیکل رہنمائی کے لئے ڈاکٹر موڈ",
                    },
                    {
                      icon: Mic,
                      english: "Realtime voice support using OpenAI Realtime",
                      urdu: "OpenAI Realtime کے ساتھ لائیو صوتی رہنمائی",
                    },
                  ].map((item) => (
                    <div key={item.english} className="rounded-[24px] border border-white/12 bg-white/10 p-4">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex rounded-2xl bg-white/12 p-2.5">
                          <item.icon className="h-5 w-5 text-white" />
                        </span>
                        <LocalizedText
                          as="div"
                          className="text-base font-semibold text-white"
                          english={item.english}
                          urdu={item.urdu}
                          urduClassName="font-urdu text-right"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div>
            <div>
              <div className="section-kicker">
                <LocalizedText english="Core Services" urdu="بنیادی خدمات" />
              </div>
              <h2 className="mt-4 text-3xl font-semibold text-[#3b1725] sm:text-4xl">
                <LocalizedText
                  as="span"
                  english="Core services for addiction treatment and mental health care."
                  urdu="نشے کے علاج اور ذہنی صحت کی نگہداشت کی بنیادی خدمات"
                  urduClassName="font-urdu text-right"
                />
              </h2>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {serviceCards.map((card) => (
              <Link key={card.href} href={card.href} className="service-card group">
                <Image
                  src={card.image}
                  alt={card.title.english}
                  width={1200}
                  height={900}
                  className="h-60 w-full object-cover"
                  unoptimized
                />
                <div className="space-y-4 p-6">
                  <div className="inline-flex rounded-2xl bg-primary/10 p-2.5 text-primary">
                    <card.icon className="h-5 w-5" />
                  </div>
                  <LocalizedText
                    as="div"
                    className="text-2xl font-semibold text-[#3b1725]"
                    english={card.title.english}
                    urdu={card.title.urdu}
                    urduClassName="font-urdu text-right"
                  />
                  <LocalizedText
                    as="p"
                    className="text-base leading-8 text-[#5a3743]"
                    english={card.description.english}
                    urdu={card.description.urdu}
                    urduClassName="font-urdu text-right"
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-y border-[#ead6dc] bg-white/65">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
            <div className="rounded-[30px] border border-[#ead6dc] bg-white p-6 shadow-soft sm:p-8">
              <div className="section-kicker">
                <LocalizedText english="Treatment Tracks" urdu="علاج کے مراحل" />
              </div>
              <h2 className="mt-4 text-3xl font-semibold text-[#3b1725] sm:text-4xl">
                <LocalizedText
                  as="span"
                  english="Structured counseling and recovery pathways."
                  urdu="منظم counseling اور recovery pathways"
                  urduClassName="font-urdu text-right"
                />
              </h2>
              <div className="mt-6 grid gap-4">
                {treatmentTracks.map((track) => (
                  <Link
                    key={track.href}
                    href={track.href}
                    className="flex items-start gap-4 rounded-[24px] border border-[#ead6dc] bg-[#fff8fa] p-4 transition hover:border-primary/30"
                  >
                    <Image
                      src={track.image}
                      alt={track.title}
                      width={64}
                      height={64}
                      className="h-14 w-14 object-contain"
                      unoptimized
                    />
                    <div>
                      <LocalizedText
                        as="div"
                        className="text-lg font-semibold text-[#3b1725]"
                        english={track.title}
                        urdu={treatmentTrackTranslations[track.title]?.titleUrdu ?? track.title}
                        urduClassName="font-urdu text-right"
                      />
                      <LocalizedText
                        as="div"
                        className="mt-2 text-base leading-7 text-[#5a3743]"
                        english={track.summary}
                        urdu={treatmentTrackTranslations[track.title]?.summaryUrdu ?? track.summary}
                        urduClassName="font-urdu text-right"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="grid gap-5">
              <div className="overflow-hidden rounded-[30px] border border-[#ead6dc] bg-white shadow-soft">
                <Image
                  src={SITE_MEDIA.facilities.islamabadGroup}
                  alt="Willing Ways group session"
                  width={1200}
                  height={900}
                  className="h-56 w-full object-cover"
                  unoptimized
                />
                <div className="p-6">
                  <div className="section-kicker">
                    <LocalizedText english="Conditions Treated" urdu="جن مسائل کا علاج کیا جاتا ہے" />
                  </div>
                  <div className="mt-5 grid gap-3">
                    {conditions.map((condition) => (
                      <div
                        key={condition.english}
                        className="flex items-start gap-3 rounded-[22px] border border-[#ead6dc] bg-[#fff8fa] px-4 py-4"
                      >
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        <LocalizedText
                          as="div"
                          className="text-base leading-7 text-[#5a3743]"
                          english={condition.english}
                          urdu={condition.urdu}
                          urduClassName="font-urdu text-right"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] border border-[#ead6dc] bg-white p-6 shadow-soft">
                <div className="section-kicker">
                  <LocalizedText english="Library" urdu="لائبریری" />
                </div>
                <h3 className="mt-4 text-2xl font-semibold text-[#3b1725]">
                  <LocalizedText
                    as="span"
                    english="Browse Willing Ways resources, videos, articles, and FAQs."
                    urdu="ولنگ ویز کے وسائل، ویڈیوز، مضامین اور FAQs دیکھیں"
                    urduClassName="font-urdu text-right"
                  />
                </h3>
                <p className="mt-3 text-base leading-8 text-[#5a3743]">
                  <LocalizedText
                    as="span"
                    english="Patients, families, staff, and referral doctors can review the same Willing Ways knowledge base in one place."
                    urdu="مریض، خاندان، عملہ اور referral doctors ایک ہی جگہ ولنگ ویز کا علمی مواد دیکھ سکتے ہیں۔"
                    urduClassName="font-urdu text-right"
                  />
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="rounded-[34px] border border-[#ead6dc] bg-white p-6 shadow-soft sm:p-8">
              <div className="flex items-center gap-4">
                <Image
                  src={SITE_MEDIA.founder}
                  alt="Dr. Sadaqat Ali"
                  width={112}
                  height={112}
                  className="h-24 w-24 rounded-[24px] object-cover"
                  unoptimized
                />
                <div>
                  <div className="section-kicker">
                    <LocalizedText english="Founder" urdu="بانی" />
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-[#3b1725]">Dr. Sadaqat Ali</div>
                </div>
              </div>

              <p className="mt-6 text-lg leading-9 text-[#5a3743]">
                <LocalizedText
                  as="span"
                  english="Willing Ways follows Dr. Sadaqat Ali’s long-standing approach: addiction is a chronic disease, family involvement matters, and recovery requires structure beyond simply stopping the substance."
                  urdu="ولنگ ویز ڈاکٹر صداقت علی کے دیرینہ طریقہ علاج پر عمل کرتا ہے: addiction ایک chronic disease ہے، family involvement اہم ہے، اور recovery کے لئے صرف substance چھوڑ دینا کافی نہیں بلکہ ایک منظم structure بھی ضروری ہے۔"
                  urduClassName="font-urdu text-right"
                />
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/ai" className="site-cta-button">
                  <Mic className="h-4 w-4" />
                  <LocalizedText english="Try voice and chat" urdu="voice اور chat آزمائیں" />
                </Link>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {[
                {
                  branch: BRANCH_CONTACTS[0],
                  image: SITE_MEDIA.facilities.lahoreCampus,
                },
                {
                  branch: BRANCH_CONTACTS[1],
                  image: SITE_MEDIA.facilities.karachiExterior,
                },
                {
                  branch: BRANCH_CONTACTS[3],
                  image: SITE_MEDIA.facilities.islamabadCampus,
                },
              ].map(({ branch, image }) => (
                <div
                  key={branch.name}
                  className="overflow-hidden rounded-[30px] border border-[#ead6dc] bg-white shadow-soft"
                >
                  <Image
                    src={image}
                    alt={branch.name}
                    width={900}
                    height={900}
                    className="h-44 w-full object-cover"
                    unoptimized
                  />
                  <div className="space-y-3 p-5">
                    <div className="text-xl font-semibold text-[#3b1725]">{branch.name}</div>
                    <div className="text-base leading-8 text-[#5a3743]">{branch.address}</div>
                    <div className="text-base font-semibold text-[#3b1725]">{branch.phones[0]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
