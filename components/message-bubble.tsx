"use client";

import { Copy, RotateCcw, Square, Volume2 } from "lucide-react";
import type { UIMessage } from "ai";

import { getMessageText, isUrduText } from "@/lib/chat";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

interface MessageBubbleProps {
  assistantLabel?: string;
  canRegenerate: boolean;
  isLatestAssistant: boolean;
  message: UIMessage;
  onCopy: (text: string) => void;
  onReadAloud?: (messageId: string, text: string) => void;
  onRegenerate: () => void;
  presentationMode?: boolean;
  readAloudActiveMessageId?: string | null;
  readAloudLoadingMessageId?: string | null;
}

export function MessageBubble({
  assistantLabel = "Willing Ways AI",
  canRegenerate,
  isLatestAssistant,
  message,
  onCopy,
  onReadAloud,
  onRegenerate,
  presentationMode = false,
  readAloudActiveMessageId = null,
  readAloudLoadingMessageId = null,
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
          presentationMode ? "sm:max-w-[92%] rounded-[28px] px-5 py-4 sm:px-6 sm:py-5" : "",
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
          {isUser ? (isUrdu ? "آپ" : "You") : isUrdu ? "ڈاکٹر صداقت GPT" : assistantLabel}
        </div>

        {isUser ? (
          <div
            className={cn(
              "whitespace-pre-wrap text-[15px] leading-7 text-slate-900 sm:text-[16px]",
              presentationMode ? "text-[17px] leading-8 sm:text-[21px] sm:leading-9" : "",
            )}
          >
            {text}
          </div>
        ) : (
          <div
            className={cn(
              "space-y-4 text-[15px] leading-7 text-slate-800 sm:text-[16px]",
              presentationMode ? "text-[17px] leading-8 sm:text-[22px] sm:leading-10" : "",
            )}
          >
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
          <div
            className={cn(
              "mt-4 flex flex-wrap gap-2 opacity-100 transition",
              presentationMode ? "" : "sm:opacity-0 sm:group-hover:opacity-100",
            )}
          >
            <Button variant="ghost" size="sm" onClick={() => onCopy(text)}>
              <Copy className="h-3.5 w-3.5" />
              {isUrdu ? "کاپی" : "Copy"}
            </Button>

            {onReadAloud ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReadAloud(message.id, text)}
                disabled={readAloudLoadingMessageId !== null && readAloudLoadingMessageId !== message.id}
              >
                {readAloudActiveMessageId === message.id ? (
                  <Square className="h-3.5 w-3.5" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" />
                )}
                {readAloudLoadingMessageId === message.id
                  ? isUrdu
                    ? "آواز بن رہی ہے"
                    : "Preparing audio"
                  : readAloudActiveMessageId === message.id
                    ? isUrdu
                      ? "آواز بند کریں"
                      : "Stop audio"
                    : isUrdu
                      ? "بلند آواز میں سنیں"
                      : "Read aloud"}
              </Button>
            ) : null}

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
