"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  Globe,
  Mail,
  MapPin,
  Menu,
  MessageSquarePlus,
  Phone,
  Trash2,
  X,
} from "lucide-react";

import {
  BRANCH_CONTACTS,
  PRIMARY_CONTACTS,
  QUICK_LINKS,
  SERVICE_HIGHLIGHTS,
  formatSessionTimestamp,
  languageLabel,
  modeLabel,
  type ChatSession,
} from "@/lib/chat";
import { SITE_MEDIA } from "@/lib/site-assets";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

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
  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-950/55 backdrop-blur-sm lg:hidden"
          onClick={() => onOpenChange(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[320px] transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="sidebar-panel relative flex h-full flex-col border-r border-white/10 px-5 py-5 text-white shadow-2xl shadow-slate-950/30">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/14 bg-white/10">
                  <Image
                    src={SITE_MEDIA.brandMark}
                    alt="Willing Ways"
                    width={48}
                    height={48}
                    className="h-7 w-7 object-contain"
                    unoptimized
                  />
                </span>
                <div className="sidebar-chip">Willing Ways AI</div>
              </div>
              <h1 className="mt-3 font-serif text-2xl font-semibold leading-tight">
                Compassionate intake support for patients, families, and doctors
              </h1>
              <p className="mt-2 text-sm leading-6 text-white/70">
                Ask about admissions, interventions, treatment tracks, branch contacts, relapse,
                psychiatric support, or family guidance.
              </p>
              <div className="mt-4 overflow-hidden rounded-[22px] border border-white/12 bg-white/8 p-3">
                <Image
                  src={SITE_MEDIA.logo}
                  alt="Willing Ways"
                  width={280}
                  height={70}
                  className="h-10 w-auto object-contain"
                  unoptimized
                />
              </div>
              <Link
                href="/"
                className="mt-4 inline-flex rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/80 transition hover:bg-white/12 hover:text-white"
              >
                Back to website
              </Link>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <Button variant="accent" className="w-full justify-center" onClick={onNewChat}>
            <MessageSquarePlus className="h-4 w-4" />
            New conversation
          </Button>

          <ScrollArea className="mt-5 flex-1 pr-2">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
                  Chat history
                </div>
                <Menu className="h-4 w-4 text-white/35" />
              </div>

              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "group rounded-[22px] border px-4 py-3 transition",
                      session.id === activeChatId
                        ? "border-white/20 bg-white/14 shadow-lg shadow-slate-950/20"
                        : "border-white/5 bg-white/6 hover:border-white/15 hover:bg-white/10",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => onSelectChat(session.id)}
                      >
                        <div className="truncate text-sm font-semibold text-white">{session.title}</div>
                        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.18em] text-white/55">
                          <span>{modeLabel(session.mode)}</span>
                          <span>{formatSessionTimestamp(session.updatedAt)}</span>
                        </div>
                        <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white/40">
                          {languageLabel(session.language)}
                        </div>
                      </button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-white/45 hover:bg-white/10 hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
                        onClick={() => onDeleteChat(session.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete chat</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <Separator className="my-6 bg-white/10" />

            <section id="about">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
                About
              </div>
              <div className="mt-4 grid gap-3">
                <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
                  <div className="mb-2 inline-flex rounded-full bg-white/10 p-2">
                    <Building2 className="h-4 w-4 text-white/80" />
                  </div>
                  <div className="text-base font-semibold">Willing Ways Pakistan</div>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    Founded by Dr. Sadaqat Ali, with 50+ years of addiction treatment and mental
                    health rehabilitation experience across Lahore, Karachi, and Islamabad.
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
                  <div className="flex items-center gap-4">
                    <Image
                      src={SITE_MEDIA.founder}
                      alt="Dr. Sadaqat Ali"
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-2xl object-cover"
                      unoptimized
                    />
                    <div>
                      <div className="text-sm font-semibold text-white">Dr. Sadaqat Ali</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/50">
                        Founder
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  ["50+", "Years"],
                  ["5,000+", "Clients"],
                  ["3", "Cities"],
                ].map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-[22px] border border-white/10 bg-white/8 px-3 py-4 text-center"
                  >
                    <div className="text-lg font-semibold text-white">{value}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/55">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <Separator className="my-6 bg-white/10" />

            <section id="services">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
                Services
              </div>
              <div className="mt-4 space-y-3">
                {SERVICE_HIGHLIGHTS.map((service) => (
                  <div
                    key={service}
                    className="rounded-[22px] border border-white/10 bg-white/8 px-4 py-3 text-sm leading-6 text-white/72"
                  >
                    {service}
                  </div>
                ))}
              </div>
            </section>

            <Separator className="my-6 bg-white/10" />

            <section>
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
                Quick links
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_LINKS.map((link) => (
                  <Button
                    key={link.id}
                    variant="ghost"
                    size="sm"
                    className="rounded-full border border-white/10 bg-white/8 text-white/80 hover:bg-white/12 hover:text-white"
                    onClick={() =>
                      document.getElementById(link.id)?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                  >
                    {link.label}
                  </Button>
                ))}
              </div>
            </section>

            <Separator className="my-6 bg-white/10" />

            <section id="contact">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
                Contact
              </div>

              <div className="mt-4 space-y-3">
                {PRIMARY_CONTACTS.map((contact) => {
                  const Icon = contact.label === "Email" ? Mail : contact.label === "Website" ? Globe : Phone;

                  return (
                    <div
                      key={contact.label}
                      className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-white/8 px-4 py-3"
                    >
                      <span className="inline-flex rounded-full bg-white/10 p-2">
                        <Icon className="h-4 w-4 text-white/75" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                          {contact.label}
                        </div>
                        <div className="truncate text-sm text-white">{contact.value}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 space-y-3">
                {BRANCH_CONTACTS.map((branch) => (
                  <div
                    key={branch.name}
                    className="rounded-[24px] border border-white/10 bg-white/8 p-4 text-sm text-white/75"
                  >
                    <div className="font-semibold text-white">{branch.name}</div>
                    <div className="mt-3 flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-teal-200" />
                      <span>{branch.address}</span>
                    </div>
                    <div className="mt-2 flex items-start gap-2">
                      <Phone className="mt-0.5 h-4 w-4 shrink-0 text-blue-200" />
                      <span>{branch.phones.join(" • ")}</span>
                    </div>
                    {branch.email ? (
                      <div className="mt-2 flex items-start gap-2">
                        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-teal-200" />
                        <span>{branch.email}</span>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          </ScrollArea>
        </div>
      </aside>
    </>
  );
}
