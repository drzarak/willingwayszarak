"use client";

import type { ChatLanguage } from "@/lib/chat";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  language: ChatLanguage;
  onChange: (language: ChatLanguage) => void;
}

export function LanguageToggle({ language, onChange }: LanguageToggleProps) {
  return (
    <div className="relative grid h-12 w-full min-w-0 grid-cols-2 rounded-full border border-slate-200 bg-white/92 p-1 shadow-sm backdrop-blur sm:min-w-[140px]">
      <div
        className={cn(
          "absolute inset-y-1 rounded-full bg-slate-100 shadow-sm transition-all duration-300",
          language === "english" ? "left-1 right-1/2 mr-1" : "left-1/2 right-1 ml-1",
        )}
      />

      <button
        type="button"
        className={cn(
          "relative z-10 rounded-full px-3 text-xs font-semibold uppercase tracking-[0.18em] transition-colors",
          language === "english" ? "text-slate-900" : "text-slate-500",
        )}
        onClick={() => onChange("english")}
      >
        EN
      </button>
      <button
        type="button"
        className={cn(
          "relative z-10 rounded-full px-3 text-xs font-semibold transition-colors",
          language === "urdu" ? "text-slate-900" : "text-slate-500",
        )}
        onClick={() => onChange("urdu")}
      >
        اردو
      </button>
    </div>
  );
}
