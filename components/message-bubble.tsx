"use client";

import { Copy, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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

  if (!text && !isUser) {
    return null;
  }

  return (
    <div className={cn("group flex w-full", isUser ? "justify-end" : "justify-start")} dir={isUrdu ? "rtl" : "ltr"}>
      <div
        className={cn(
          "max-w-[94%] rounded-[30px] px-5 py-4 shadow-sm sm:max-w-[85%]",
          isUser
            ? "bg-gradient-to-br from-primary to-[#8e3a52] text-white shadow-card"
            : "border border-[#ead6dc] bg-white/95 text-slate-800 shadow-card backdrop-blur-xl",
        )}
      >
        <div
          className={cn(
            "mb-3 text-[11px] font-semibold uppercase tracking-[0.2em]",
            isUser ? "text-white/70" : "text-slate-400",
          )}
        >
          {isUser ? (isUrdu ? "آپ" : "You") : isUrdu ? "ولنگ ویز اے آئی" : "Willing Ways AI"}
        </div>

        {isUser ? (
          <div className="whitespace-pre-wrap text-[16px] leading-8">{text}</div>
        ) : (
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
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
