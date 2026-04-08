"use client";

import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

interface PrivacyDeviceToggleProps {
  checked: boolean;
  compact?: boolean;
  isUrdu?: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function PrivacyDeviceToggle({
  checked,
  compact = false,
  isUrdu = false,
  onCheckedChange,
}: PrivacyDeviceToggleProps) {
  const compactLabel = checked
    ? isUrdu
      ? "ڈیوائس پر"
      : "On device"
    : isUrdu
      ? "پرائیویٹ"
      : "Private";

  return (
    <button
      type="button"
      onClick={() => onCheckedChange(!checked)}
      aria-label={
        checked
          ? isUrdu
            ? "ڈوائس پر گفتگو محفوظ رکھیں"
            : "Remember conversations on this device"
          : isUrdu
            ? "اس گفتگو کو اسی سیشن تک محدود رکھیں"
            : "Keep conversations only for this visit"
      }
      className={cn(
        "group inline-flex items-center gap-3 rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:ring-slate-400",
        checked
          ? "border-emerald-200 bg-emerald-50 text-emerald-900 shadow-[0_10px_30px_rgba(16,185,129,0.12)]"
          : "border-slate-200 bg-white/80 text-slate-700 hover:border-slate-300 hover:bg-white",
        compact ? "px-3 py-2" : "px-4 py-2.5",
        "min-h-[48px]",
      )}
      aria-pressed={checked}
    >
      <span
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors",
          checked ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500",
        )}
      >
        <ShieldCheck className="h-4 w-4" />
      </span>

      {compact ? (
        <span
          className={cn("min-w-0 text-left text-sm font-semibold leading-5", isUrdu ? "font-urdu" : "")}
          dir={isUrdu ? "rtl" : "ltr"}
        >
          {compactLabel}
        </span>
      ) : (
        <span className={cn("min-w-0 text-left", isUrdu ? "font-urdu" : "")} dir={isUrdu ? "rtl" : "ltr"}>
          <span className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            {isUrdu ? "ڈیوائس پرائیویسی" : "Device privacy"}
          </span>
          <span className="block text-sm font-semibold leading-5">
            {checked
              ? isUrdu
                ? "یہ ڈیوائس گفتگو یاد رکھے"
                : "Remember chats on this device"
              : isUrdu
                ? "گفتگو صرف اسی نشست تک"
                : "Keep chats only for this visit"}
          </span>
        </span>
      )}

      {!compact ? (
        <Button
          type="button"
          variant={checked ? "outline" : "surface"}
          size="sm"
          className="pointer-events-none rounded-full"
          tabIndex={-1}
        >
          {checked ? (isUrdu ? "آن" : "On") : isUrdu ? "آف" : "Off"}
        </Button>
      ) : null}
    </button>
  );
}
