"use client";

import {
  RECOVERY_PROGRAMS,
  type RecoveryProgram,
  type RecoveryProgramId,
} from "@/lib/recovery-programs";

interface ProgramCardListProps {
  language: "english" | "urdu";
  programIds?: RecoveryProgramId[];
  selectedProgramId?: RecoveryProgram["id"];
  onSelect?: (programId: RecoveryProgram["id"]) => void;
}

export function ProgramCardList({
  language,
  programIds,
  selectedProgramId,
  onSelect,
}: ProgramCardListProps) {
  const programs = programIds?.length
    ? programIds
        .map((id) => RECOVERY_PROGRAMS.find((program) => program.id === id))
        .filter((program): program is RecoveryProgram => Boolean(program))
    : RECOVERY_PROGRAMS;

  return (
    <div className="space-y-2.5">
      {programs.map((program) => {
        const isSelected = program.id === selectedProgramId;
        const tagline = language === "urdu" ? program.urduTagline : program.englishTagline;
        const nextAction =
          (language === "urdu" ? program.urduNextActions : program.englishNextActions)[0] ?? "";

        return (
          <button
            key={program.id}
            type="button"
            onClick={() => onSelect?.(program.id)}
            className={`group flex w-full items-start gap-3 rounded-[22px] border px-4 py-3.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
              isSelected
                ? "border-slate-900/15 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.06)]"
                : "border-slate-200 bg-white/86 hover:border-slate-300 hover:bg-white"
            }`}
          >
            <span
              className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                isSelected ? "bg-slate-900" : "bg-slate-300"
              }`}
              aria-hidden="true"
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div
                  className={language === "urdu" ? "font-urdu text-right" : ""}
                  dir={language === "urdu" ? "rtl" : "ltr"}
                >
                  <div className="text-[15px] font-semibold text-slate-950">
                    {language === "urdu" ? program.urduLabel : program.englishLabel}
                  </div>
                  <div className="mt-1 text-sm leading-6 text-slate-600">{tagline}</div>
                </div>

                <div
                  className={`shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 ${
                    language === "urdu" ? "font-urdu normal-case text-right" : "text-right"
                  }`}
                  dir={language === "urdu" ? "rtl" : "ltr"}
                >
                  {language === "urdu" ? program.urduCadence : program.englishCadence}
                </div>
              </div>

              <div
                className={`mt-2 text-xs leading-5 text-slate-500 ${
                  language === "urdu" ? "font-urdu text-right" : ""
                }`}
                dir={language === "urdu" ? "rtl" : "ltr"}
              >
                {language === "urdu" ? "اگلا قدم" : "Next step"}: {nextAction}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
