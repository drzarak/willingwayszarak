"use client";

import { Copy, RotateCcw } from "lucide-react";
import type { UIMessage } from "ai";

import { getMessageText, isUrduText } from "@/lib/chat";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

interface MessageBubbleProps {
  canRegenerate: boolean;
  isLatestAssistant: boolean;
  message: UIMessage;
  onCopy: (text: string) => void;
  onRegenerate: () => void;
}

export function MessageBubble({
  canRegenerate,
  isLatestAssistant,
  message,
  onCopy,
  onRegenerate,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const text = getMessageText(message);
  const isUrdu = isUrduText(text);
  const assistantParagraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (!text && !isUser) {
    return null;
  }

  return (
    <div className={cn("group flex w-full", isUser ? "justify-end" : "justify-start")} dir={isUrdu ? "rtl" : "ltr"}>
      <div
        className={cn(
          "max-w-[94%] rounded-[24px] px-4 py-3.5 shadow-[0_10px_26px_rgba(15,23,42,0.04)] sm:max-w-[85%] sm:px-5 sm:py-4",
          isUser
            ? "border border-slate-200 bg-[#f3f4f6] text-slate-900"
            : "border border-slate-100 bg-white text-slate-800",
        )}
      >
        <div
          className={cn(
            "mb-2 text-[11px] font-semibold uppercase tracking-[0.18em]",
            isUser ? "text-slate-500" : "text-slate-400",
          )}
        >
          {isUser ? (isUrdu ? "آپ" : "You") : isUrdu ? "ولنگ ویز اے آئی" : "Willing Ways AI"}
        </div>

        {isUser ? (
          <div className="whitespace-pre-wrap text-[15px] leading-7 text-slate-900 sm:text-[16px]">{text}</div>
        ) : (
          <div className="space-y-4 text-[15px] leading-7 text-slate-800 sm:text-[16px]">
            {assistantParagraphs.length > 0 ? (
              assistantParagraphs.map((paragraph, index) => (
                <p key={`${message.id}:paragraph:${index}`} className="whitespace-pre-wrap">
                  {paragraph}
                </p>
              ))
            ) : (
              <p className="whitespace-pre-wrap">{text}</p>
            )}
          </div>
        )}

        {!isUser ? (
          <div className="mt-4 flex flex-wrap gap-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
            <Button variant="ghost" size="sm" onClick={() => onCopy(text)}>
              <Copy className="h-3.5 w-3.5" />
              {isUrdu ? "کاپی" : "Copy"}
            </Button>

            {isLatestAssistant && canRegenerate ? (
              <Button variant="ghost" size="sm" onClick={onRegenerate}>
                <RotateCcw className="h-3.5 w-3.5" />
                {isUrdu ? "دوبارہ جواب" : "Regenerate"}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
