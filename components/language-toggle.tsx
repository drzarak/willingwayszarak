"use client";

import type { ChatLanguage } from "@/lib/chat";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  language: ChatLanguage;
  onChange: (language: ChatLanguage) => void;
  className?: string;
  compact?: boolean;
}

export function LanguageToggle({
  language,
  onChange,
  className,
  compact = false,
}: LanguageToggleProps) {
  return (
    <div
      role="group"
      aria-label="Switch interface language"
      className={cn(
        "relative grid w-full min-w-0 grid-cols-2 rounded-full border border-slate-200 bg-white/92 p-1 shadow-sm backdrop-blur",
        compact ? "min-h-[54px] text-xs sm:min-w-[144px]" : "min-h-[60px] sm:min-w-[150px]",
        className,
      )}
    >
      <div
        className={cn(
          "absolute inset-y-1 rounded-full bg-slate-100 shadow-sm transition-all duration-300",
          language === "english" ? "left-1 right-1/2 mr-1" : "left-1/2 right-1 ml-1",
        )}
      />

      <button
        type="button"
        aria-label="Switch language to English"
        aria-pressed={language === "english"}
        className={cn(
          "relative z-10 min-h-[48px] w-full rounded-full px-3 font-semibold uppercase tracking-[0.18em] transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:ring-slate-400",
          compact ? "text-xs" : "text-sm",
          language === "english" ? "text-slate-900" : "text-slate-600",
        )}
        onClick={() => onChange("english")}
      >
        EN
      </button>
      <button
        type="button"
        aria-label="Switch language to Urdu"
        aria-pressed={language === "urdu"}
        className={cn(
          "relative z-10 min-h-[48px] w-full rounded-full px-3 font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:ring-slate-400",
          compact ? "text-[13px]" : "text-sm",
          language === "urdu" ? "text-slate-900" : "text-slate-600",
        )}
        onClick={() => onChange("urdu")}
      >
        اردو
      </button>
    </div>
  );
}
