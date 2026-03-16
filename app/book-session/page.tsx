import Link from "next/link";
import { CalendarDays, MessageSquareHeart, PhoneCall } from "lucide-react";

import { BookingRequestForm } from "@/components/booking-request-form";
import { LocalizedText } from "@/components/localized-text";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function BookSessionPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        <section className="border-b border-[#ead6dc] bg-white/70">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.04fr_0.96fr] lg:px-8 lg:py-16">
            <div>
              <div className="section-kicker">
                <LocalizedText english="Book a Session" urdu="سیشن بک کریں" />
              </div>
              <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight text-[#3b1725] sm:text-5xl">
                <LocalizedText
                  as="span"
                  english="Request a session, admission callback, or family consultation online."
                  urdu="آن لائن سیشن، داخلے کے callback یا فیملی consultation کی درخواست بھیجیں"
                  urduClassName="font-urdu text-right"
                />
              </h1>
              <p className="mt-5 max-w-3xl text-xl leading-9 text-[#5a3743]">
                <LocalizedText
                  as="span"
                  english="Patients, families, and referring doctors can use this form to ask the Willing Ways intake team for a callback. For emergencies, call immediately instead of waiting for a reply."
                  urdu="مریض، خاندان اور referring doctors اس فارم کے ذریعے ولنگ ویز کی intake team سے callback کی درخواست کر سکتے ہیں۔ ہنگامی صورت میں جواب کا انتظار کرنے کے بجائے فوراً کال کریں۔"
                  urduClassName="font-urdu text-right"
                />
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a href="tel:+923007413639" className="site-cta-button">
                  <PhoneCall className="h-4 w-4" />
                  <LocalizedText english="Call admissions now" urdu="ابھی داخلے کے لئے کال کریں" />
                </a>
                <Link href="/ai" className="site-action-link">
                  <MessageSquareHeart className="h-4 w-4" />
                  <LocalizedText english="Use AI guided intake instead" urdu="اس کے بجائے AI guided intake استعمال کریں" />
                </Link>
              </div>
            </div>

            <div className="hero-panel">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
                <CalendarDays className="h-3.5 w-3.5" />
                <LocalizedText english="Direct intake route" urdu="براہ راست intake راستہ" />
              </div>
              <div className="mt-5 grid gap-3">
                {[
                  {
                    english: "Choose your preferred branch, language, and contact method.",
                    urdu: "اپنی ترجیحی برانچ، زبان اور رابطے کا طریقہ منتخب کریں۔",
                  },
                  {
                    english: "Explain briefly whether this is for rehab, psychiatry, family intervention, or follow-up.",
                    urdu: "مختصراً بتائیں کہ یہ rehab، psychiatry، family intervention یا follow-up کے لئے ہے۔",
                  },
                  {
                    english: "Your request goes to the intake team so they can respond outside the AI chat.",
                    urdu: "آپ کی درخواست intake team تک جاتی ہے تاکہ وہ اے آئی چیٹ سے ہٹ کر آپ سے رابطہ کر سکیں۔",
                  },
                  {
                    english: "If you prefer speaking instead of typing, the AI page can turn your voice story into a reviewed intake handoff before you send it.",
                    urdu: "اگر آپ لکھنے کے بجائے بولنا چاہیں تو AI page آپ کی voice story کو reviewed intake handoff میں بدل سکتا ہے، پھر آپ اسے بھیج سکتے ہیں۔",
                  },
                ].map((item) => (
                  <div key={item.english} className="rounded-[24px] border border-white/12 bg-white/10 p-4">
                    <LocalizedText
                      as="div"
                      className="text-base leading-8 text-white"
                      english={item.english}
                      urdu={item.urdu}
                      urduClassName="font-urdu text-right"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <BookingRequestForm />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
