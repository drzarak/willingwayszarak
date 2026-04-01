"use client";

import { RECOVERY_PROGRAMS, HOME_RECOVERY_PROGRAM_IDS } from "@/lib/recovery-programs";
import { useMemo } from "react";

interface CareOutcomesStripProps {
  language: "english" | "urdu";
}

export function CareOutcomesStrip({ language }: CareOutcomesStripProps) {
  const programs = useMemo(
    () =>
      HOME_RECOVERY_PROGRAM_IDS.map((id) => RECOVERY_PROGRAMS.find((program) => program.id === id)).filter(
        (program): program is (typeof RECOVERY_PROGRAMS)[number] => Boolean(program),
      ),
    [],
  );

  return (
    <section className="mx-auto mt-6 max-w-3xl space-y-4 rounded-[32px] border border-white/40 bg-gradient-to-b from-white/80 via-white/60 to-white/60 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="flex w-full flex-col items-start gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          {language === "urdu" ? "Willing Ways care outcomes" : "Willing Ways care outcomes"}
        </p>
        <h2
          className={`text-xl font-semibold leading-tight text-slate-900 ${language === "urdu" ? "font-urdu" : ""}`}
          dir={language === "urdu" ? "rtl" : "ltr"}
        >
          {language === "urdu"
            ? "خاندان اور مریض دونوں کے لئے واضح کام اور نتیجہ"
            : "Clear work and real outcomes for families and patients"}
        </h2>
        <p
          className={`max-w-[560px] text-sm leading-7 text-slate-600 ${language === "urdu" ? "font-urdu" : ""}`}
          dir={language === "urdu" ? "rtl" : "ltr"}
        >
          {language === "urdu"
            ? "ہر پروگرام ایک خاص مسئلے کو حل کرتا ہے: ایک گھر کا پلان، سٹریس پر قابو، یا خاندانی اسٹینڈ۔ AI آپ کو اگلے قدم دے کر ڈرامہ کم کرتی ہے۔"
            : "Each program addresses a concrete challenge—home plans, stress control, or family stands—while the AI hands you the next step so nothing slips through the cracks."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {programs.map((program) => (
          <article
            key={program.id}
            className="flex flex-col rounded-[28px] border border-white/70 bg-white/90 p-4 text-left shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
          >
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              {language === "urdu" ? program.urduCadence : program.englishCadence}
            </div>
            <h3
              className={`mt-2 text-lg font-semibold text-slate-950 ${language === "urdu" ? "font-urdu" : ""}`}
              dir={language === "urdu" ? "rtl" : "ltr"}
            >
              {language === "urdu" ? program.urduLabel : program.englishLabel}
            </h3>
            <p
              className={`mt-1 text-sm leading-6 text-slate-600 ${language === "urdu" ? "font-urdu" : ""}`}
              dir={language === "urdu" ? "rtl" : "ltr"}
            >
              {language === "urdu" ? program.urduOutcome : program.englishOutcome}
            </p>
            <ul className="mt-3 space-y-2 text-[13px] text-slate-600">
              {(language === "urdu" ? program.urduNextActions : program.englishNextActions).map((step) => (
                <li key={step} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-700" />
                  <span className={language === "urdu" ? "font-urdu" : ""} dir={language === "urdu" ? "rtl" : "ltr"}>
                    {step}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
