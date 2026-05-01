"use client";

import { Stethoscope, Users } from "lucide-react";

import type { ChatMode } from "@/lib/chat";
import { cn } from "@/lib/utils";

interface ModeToggleProps {
  mode: ChatMode;
  onChange: (mode: ChatMode) => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="relative grid h-12 w-full min-w-[280px] grid-cols-2 rounded-full border border-white/70 bg-white/80 p-1 shadow-sm backdrop-blur sm:min-w-[320px]">
      <div
        className={cn(
          "absolute inset-y-1 rounded-full bg-slate-950 shadow-sm transition-all duration-300",
          mode === "patient" ? "left-1 right-1/2 mr-1" : "left-1/2 right-1 ml-1",
        )}
      />

      <button
        type="button"
        className={cn(
          "relative z-10 inline-flex items-center justify-center gap-2 rounded-full px-4 text-xs font-semibold uppercase tracking-[0.18em] transition-colors",
          mode === "patient" ? "text-white" : "text-slate-600",
        )}
        onClick={() => onChange("patient")}
      >
        <Users className="h-4 w-4" />
        Patient / Family
      </button>

      <button
        type="button"
        className={cn(
          "relative z-10 inline-flex items-center justify-center gap-2 rounded-full px-4 text-xs font-semibold uppercase tracking-[0.18em] transition-colors",
          mode === "doctor" ? "text-white" : "text-slate-600",
        )}
        onClick={() => onChange("doctor")}
      >
        <Stethoscope className="h-4 w-4" />
        Doctor / Clinical
      </button>
    </div>
  );
}

