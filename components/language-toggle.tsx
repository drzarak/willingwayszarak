"use client";

import type { ChatLanguage } from "@/lib/chat";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  language: ChatLanguage;
  onChange: (language: ChatLanguage) => void;
}

export function LanguageToggle({ language, onChange }: LanguageToggleProps) {
  return (
    <div className="relative grid h-12 w-full min-w-[140px] grid-cols-2 rounded-full border border-white/70 bg-white/80 p-1 shadow-sm backdrop-blur">
      <div
        className={cn(
          "absolute inset-y-1 rounded-full bg-blue-50 shadow-sm transition-all duration-300",
          language === "english" ? "left-1 right-1/2 mr-1" : "left-1/2 right-1 ml-1",
        )}
      />

      <button
        type="button"
        className={cn(
          "relative z-10 rounded-full px-3 text-xs font-semibold uppercase tracking-[0.18em] transition-colors",
          language === "english" ? "text-primary" : "text-slate-500",
        )}
        onClick={() => onChange("english")}
      >
        EN
      </button>
      <button
        type="button"
        className={cn(
          "relative z-10 rounded-full px-3 text-xs font-semibold transition-colors",
          language === "urdu" ? "text-primary" : "text-slate-500",
        )}
        onClick={() => onChange("urdu")}
      >
        اردو
      </button>
    </div>
  );
}
