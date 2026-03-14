"use client";

import type { ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

import { useSiteLanguage } from "@/components/site-language-provider";

interface LocalizedTextProps {
  as?: ElementType;
  className?: string;
  english: ReactNode;
  englishClassName?: string;
  urdu: ReactNode;
  urduClassName?: string;
}

export function LocalizedText({
  as,
  className,
  english,
  englishClassName,
  urdu,
  urduClassName,
}: LocalizedTextProps) {
  const { isUrdu } = useSiteLanguage();
  const Component = as ?? "span";

  return (
    <Component
      className={cn(
        className,
        isUrdu ? cn("font-urdu", urduClassName) : englishClassName,
      )}
      dir={isUrdu ? "rtl" : "ltr"}
      lang={isUrdu ? "ur" : "en"}
    >
      {isUrdu ? urdu : english}
    </Component>
  );
}
