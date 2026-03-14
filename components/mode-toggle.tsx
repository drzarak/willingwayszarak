"use client";

import { Stethoscope, Users } from "lucide-react";

import type { ChatMode } from "@/lib/chat";
import { cn } from "@/lib/utils";

import { useSiteLanguage } from "@/components/site-language-provider";

interface ModeToggleProps {
  mode: ChatMode;
  onChange: (mode: ChatMode) => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  const { isUrdu } = useSiteLanguage();

  return (
    <div className="relative grid h-12 w-full min-w-0 grid-cols-2 rounded-full border border-[#ead6dc] bg-white p-1 shadow-sm backdrop-blur sm:min-w-[320px]">
      <div
        className={cn(
          "absolute inset-y-1 rounded-full bg-primary shadow-sm transition-all duration-300",
          mode === "patient" ? "left-1 right-1/2 mr-1" : "left-1/2 right-1 ml-1",
        )}
      />

      <button
        type="button"
        className={cn(
          "relative z-10 inline-flex items-center justify-center gap-1 rounded-full px-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors sm:gap-2 sm:px-4 sm:text-xs sm:tracking-[0.18em]",
          mode === "patient" ? "text-white" : "text-[#6d4452]",
        )}
        onClick={() => onChange("patient")}
      >
        <Users className="h-4 w-4" />
        <span className={isUrdu ? "font-urdu" : ""} dir={isUrdu ? "rtl" : "ltr"}>
          {isUrdu ? "مریض / خاندان" : "Patient / Family"}
        </span>
      </button>

      <button
        type="button"
        className={cn(
          "relative z-10 inline-flex items-center justify-center gap-1 rounded-full px-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors sm:gap-2 sm:px-4 sm:text-xs sm:tracking-[0.18em]",
          mode === "doctor" ? "text-white" : "text-[#6d4452]",
        )}
        onClick={() => onChange("doctor")}
      >
        <Stethoscope className="h-4 w-4" />
        <span className={isUrdu ? "font-urdu" : ""} dir={isUrdu ? "rtl" : "ltr"}>
          {isUrdu ? "ڈاکٹر / کلینیکل" : "Doctor / Clinical"}
        </span>
      </button>
    </div>
  );
}
