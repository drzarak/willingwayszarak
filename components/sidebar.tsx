"use client";

import Image from "next/image";
import Link from "next/link";
import { History, MessageSquarePlus, Phone, Trash2, X } from "lucide-react";

import { formatSessionTimestamp, type ChatSession } from "@/lib/chat";
import { SITE_MEDIA } from "@/lib/site-assets";
import { cn } from "@/lib/utils";

import { useSiteLanguage } from "@/components/site-language-provider";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SidebarProps {
  activeChatId: string;
  open: boolean;
  sessions: ChatSession[];
  onDeleteChat: (chatId: string) => void;
  onNewChat: () => void;
  onOpenChange: (open: boolean) => void;
  onSelectChat: (chatId: string) => void;
}

export function Sidebar({
  activeChatId,
  open,
  sessions,
  onDeleteChat,
  onNewChat,
  onOpenChange,
  onSelectChat,
}: SidebarProps) {
  const { isUrdu } = useSiteLanguage();

  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[2px]"
          onClick={() => onOpenChange(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[320px] max-w-[88vw] transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="sidebar-panel flex h-full flex-col border-r border-slate-200 px-4 py-4 text-slate-900 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Link href="/" className="inline-flex items-center">
                <Image
                  src={SITE_MEDIA.logo}
                  alt="Willing Ways"
                  width={260}
                  height={64}
                  className="h-11 w-auto object-contain"
                  unoptimized
                />
              </Link>
              <p
                className={`mt-3 text-sm leading-6 text-slate-600 ${
                  isUrdu ? "font-urdu text-right" : ""
                }`}
                dir={isUrdu ? "rtl" : "ltr"}
              >
                {isUrdu
                  ? "پچھلی گفتگو دوبارہ کھولیں یا نئی گفتگو شروع کریں۔"
                  : "Reopen a previous conversation or start a fresh one."}
              </p>
            </div>

            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="mt-4 grid gap-3">
            <Button variant="default" className="justify-center" onClick={onNewChat}>
              <MessageSquarePlus className="h-4 w-4" />
              <span className={isUrdu ? "font-urdu" : ""} dir={isUrdu ? "rtl" : "ltr"}>
                {isUrdu ? "نئی گفتگو" : "New conversation"}
              </span>
            </Button>

            <div className="rounded-[24px] border border-[#ead6dc] bg-[#fff8fa] px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#651328]">
                <Phone className="h-4 w-4" />
                <span className={isUrdu ? "font-urdu" : ""} dir={isUrdu ? "rtl" : "ltr"}>
                  {isUrdu ? "فوری مدد" : "Urgent help"}
                </span>
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-950">0300-7413639</div>
              <div
                className={`mt-1 text-sm leading-6 text-slate-600 ${
                  isUrdu ? "font-urdu text-right" : ""
                }`}
                dir={isUrdu ? "rtl" : "ltr"}
              >
                {isUrdu
                  ? "ہنگامی صورتحال میں 1122 یا ولنگ ویز ہیلپ لائن سے فوراً رابطہ کریں۔"
                  : "For emergencies, call 1122 or the Willing Ways helpline immediately."}
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <History className="h-4 w-4" />
            <span>{isUrdu ? "حالیہ گفتگو" : "Recent chats"}</span>
          </div>

          <ScrollArea className="mt-3 flex-1 pr-2">
            <div className="space-y-2 pb-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    "group rounded-[22px] border px-4 py-3 transition",
                    session.id === activeChatId
                      ? "border-[#d5b6bf] bg-[#fff7f9] shadow-sm"
                      : "border-slate-200 bg-white hover:border-[#d9c1c7] hover:bg-[#fffafb]",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => onSelectChat(session.id)}
                    >
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {session.title}
                      </div>
                      <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        {formatSessionTimestamp(session.updatedAt)}
                      </div>
                    </button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-slate-500 hover:bg-[#fff1f4] hover:text-[#651328]"
                      onClick={() => onDeleteChat(session.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete chat</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="mt-4 rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
            <div
              className={`${isUrdu ? "font-urdu text-right" : ""}`}
              dir={isUrdu ? "rtl" : "ltr"}
            >
              {isUrdu
                ? "محبت سے تعمیر: ڈاکٹر زارک خان"
                : "Built with love by Dr Zarak Khan"}
            </div>
            <div className="mt-3 flex items-center gap-3 text-sm">
              <Link href="/about" className="site-inline-link">
                {isUrdu ? "ولنگ ویز کے بارے میں" : "About Willing Ways"}
              </Link>
              <Link href="/book-session" className="site-inline-link">
                {isUrdu ? "بکنگ فارم" : "Booking form"}
              </Link>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
