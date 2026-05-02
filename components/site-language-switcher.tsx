"use client";

import { cn } from "@/lib/utils";

import { useSiteLanguage } from "@/components/site-language-provider";

export function SiteLanguageSwitcher() {
  const { language, setLanguage } = useSiteLanguage();

  return (
    <div
      className="relative grid h-11 w-full min-w-[120px] grid-cols-2 rounded-full border border-slate-200 bg-white/92 p-1 shadow-sm"
      role="group"
      aria-label="Site language"
    >
      <div
        className={cn(
          "absolute inset-y-1 rounded-full bg-slate-100 transition-all duration-300",
          language === "english" ? "left-1 right-1/2 mr-1" : "left-1/2 right-1 ml-1",
        )}
      />

      <button
        type="button"
        className={cn(
          "relative z-10 rounded-full px-3 text-xs font-semibold uppercase tracking-[0.18em] transition-colors",
          language === "english" ? "text-slate-900" : "text-slate-500",
        )}
        onClick={() => setLanguage("english")}
        aria-pressed={language === "english"}
      >
        EN
      </button>
      <button
        type="button"
        className={cn(
          "relative z-10 rounded-full px-3 text-sm font-semibold transition-colors",
          language === "urdu" ? "text-slate-900" : "text-slate-500",
        )}
        onClick={() => setLanguage("urdu")}
        aria-pressed={language === "urdu"}
      >
        اردو
      </button>
    </div>
  );
}
