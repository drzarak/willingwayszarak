"use client";

import Link from "next/link";
import { ArrowRight, Clock3, PhoneCall, ShieldAlert } from "lucide-react";

import { FAMILY_TRAINING_LESSONS } from "@/lib/family-training";

import { LocalizedText } from "@/components/localized-text";

export function FamilyTrainingHub() {
  return (
    <section className="border-b border-[#ead6dc] bg-white/70">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="max-w-4xl">
          <div className="section-kicker">
            <LocalizedText english="Family Coaching" urdu="فیملی کوچنگ" />
          </div>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-[#3b1725] sm:text-5xl">
            <LocalizedText
              as="span"
              english="Short family practice sessions to help you talk without triggering more chaos."
              urdu="مختصر فیملی practice sessions تاکہ آپ مزید chaos پیدا کئے بغیر بات کر سکیں"
              urduClassName="font-urdu text-right"
            />
          </h1>
          <p className="mt-5 max-w-3xl text-xl leading-9 text-[#5a3743]">
            <LocalizedText
              as="span"
              english="Willing Ways teaches that the family must recover along with the patient. These guided modules help families practice calm boundaries, intervention language, and post-rehab follow-through one useful step at a time."
              urdu="ولنگ ویز کے مطابق مریض کے ساتھ خاندان کی recovery بھی ضروری ہے۔ یہ guided modules خاندان کو پرسکون boundaries، intervention language اور post-rehab follow-through ایک ایک مفید قدم کے ساتھ سکھاتے ہیں۔"
              urduClassName="font-urdu text-right"
            />
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {[
            {
              english: "3 to 6 minute practice",
              urdu: "۳ تا ۶ منٹ کی practice",
            },
            {
              english: "Pakistan-first Urdu, English, and Punjabi-friendly guidance",
              urdu: "پاکستانی انداز کی اردو، انگریزی اور پنجابی کے مطابق رہنمائی",
            },
            {
              english: "Focused on boundaries, relapse prevention, and safe family action",
              urdu: "boundaries، relapse prevention اور محفوظ family action پر توجہ",
            },
          ].map((item) => (
            <div key={item.english} className="stat-card">
              <LocalizedText
                as="div"
                className="text-base leading-8 text-[#5a3743]"
                english={item.english}
                urdu={item.urdu}
                urduClassName="font-urdu text-right"
              />
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[28px] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-950">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-1 h-5 w-5 shrink-0" />
            <div>
              <div className="font-semibold">
                <LocalizedText
                  english="Use coaching for practice, not for active emergencies."
                  urdu="active emergency میں coaching نہیں، فوری مدد استعمال کریں۔"
                  urduClassName="font-urdu text-right"
                />
              </div>
              <div className="mt-1 text-sm leading-7">
                <LocalizedText
                  english="If there is overdose, suicide risk, violent behavior, or immediate psychiatric danger, call 1122 or 0300-7413639 first."
                  urdu="اگر overdose، suicide risk، violent behavior یا فوری psychiatric danger ہو تو پہلے 1122 یا 0300-7413639 پر کال کریں۔"
                  urduClassName="font-urdu text-right"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {FAMILY_TRAINING_LESSONS.map((lesson) => (
            <article
              key={lesson.id}
              className="rounded-[30px] border border-[#ead6dc] bg-white px-5 py-5 shadow-soft"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="section-kicker bg-[#fff8fa]">
                  <Clock3 className="h-3.5 w-3.5" />
                  <LocalizedText
                    english={`${lesson.durationMinutes} min family coaching`}
                    urdu={`${lesson.durationMinutes} منٹ فیملی کوچنگ`}
                  />
                </div>
                <Link
                  href={`/?focus=family-coach&module=${lesson.id}#call`}
                  className="site-inline-link"
                >
                  <PhoneCall className="h-4 w-4" />
                  <LocalizedText
                    english="Start training call"
                    urdu="training call شروع کریں"
                    urduClassName="font-urdu"
                  />
                </Link>
              </div>

              <h2 className="mt-4 text-2xl font-semibold leading-tight text-[#3b1725]">
                <LocalizedText
                  as="span"
                  english={lesson.englishTitle}
                  urdu={lesson.urduTitle}
                  urduClassName="font-urdu text-right"
                />
              </h2>

              <p className="mt-3 text-base leading-8 text-[#5a3743]">
                <LocalizedText
                  as="span"
                  english={lesson.englishTagline}
                  urdu={lesson.urduTagline}
                  urduClassName="font-urdu text-right"
                />
              </p>

              <div className="mt-4 rounded-[24px] border border-[#f0dde2] bg-[#fff8fa] px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a4b5d]">
                  <LocalizedText english="What this module does" urdu="یہ module کیا کرتا ہے" />
                </div>
                <div className="mt-2 text-base leading-8 text-slate-800">
                  <LocalizedText
                    as="span"
                    english={lesson.englishOutcome}
                    urdu={lesson.urduOutcome}
                    urduClassName="font-urdu text-right"
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a4b5d]">
                    <LocalizedText english="Try saying" urdu="یوں کہیں" />
                  </div>
                  <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                    {lesson.englishDoSay.slice(0, 2).map((item, index) => (
                      <li key={index}>
                        <LocalizedText
                          as="span"
                          english={item}
                          urdu={lesson.urduDoSay[index] ?? item}
                          urduClassName="font-urdu text-right"
                        />
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a4b5d]">
                    <LocalizedText english="Avoid saying" urdu="یہ انداز نہ اپنائیں" />
                  </div>
                  <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                    {lesson.englishDontSay.slice(0, 2).map((item, index) => (
                      <li key={index}>
                        <LocalizedText
                          as="span"
                          english={item}
                          urdu={lesson.urduDontSay[index] ?? item}
                          urduClassName="font-urdu text-right"
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border border-slate-200 bg-[#f8f6f3] px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a4b5d]">
                  <LocalizedText english="Practice flow" urdu="practice flow" />
                </div>
                <div className="mt-2 text-sm leading-7 text-slate-700">
                  <LocalizedText
                    as="span"
                    english={lesson.englishRoleplayPrompt}
                    urdu={lesson.urduRoleplayPrompt}
                    urduClassName="font-urdu text-right"
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="max-w-xl text-sm leading-7 text-slate-600">
                  <LocalizedText
                    as="span"
                    english={lesson.englishHomework}
                    urdu={lesson.urduHomework}
                    urduClassName="font-urdu text-right"
                  />
                </div>
                <Link
                  href={`/?focus=family-coach&module=${lesson.id}#call`}
                  className="site-cta-button"
                >
                  <ArrowRight className="h-4 w-4" />
                  <LocalizedText
                    english="Start practice"
                    urdu="مشق شروع کریں"
                    urduClassName="font-urdu"
                  />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
