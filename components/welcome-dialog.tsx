"use client";

import { HeartHandshake, ShieldCheck, Stethoscope, Users } from "lucide-react";

import type { ChatMode } from "@/lib/chat";
import { modeLabel } from "@/lib/chat";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WelcomeDialogProps {
  mode: ChatMode;
  open: boolean;
  onConfirm: () => void;
  serverKeyConfigured: boolean;
}

export function WelcomeDialog({ mode, open, onConfirm, serverKeyConfigured }: WelcomeDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            <HeartHandshake className="h-3.5 w-3.5" />
            Welcome
          </div>
          <DialogTitle>New chat ready</DialogTitle>
          <DialogDescription>
            This chat is set to <strong>{modeLabel(mode)}</strong>.{" "}
            {serverKeyConfigured
              ? "This deployment is using a server-side OpenAI key."
              : "You can use a browser key now, or configure OPENAI_API_KEY on the server later."}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/90 p-4">
            <div className="mb-3 inline-flex rounded-full bg-white p-2 text-primary shadow-sm">
              {mode === "doctor" ? <Stethoscope className="h-4 w-4" /> : <Users className="h-4 w-4" />}
            </div>
            <div className="text-sm font-semibold text-slate-950">{modeLabel(mode)}</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              The system prompt will adapt its tone and detail level to this audience while keeping
              the same safety boundaries.
            </p>
          </div>

          <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/90 p-4">
            <div className="mb-3 inline-flex rounded-full bg-white p-2 text-accent shadow-sm">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="text-sm font-semibold text-slate-950">Privacy note</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {serverKeyConfigured
                ? "Requests are handled with the deployment's server-side OpenAI key, so end users do not need to expose a browser key."
                : "Until a server key is configured, any optional browser key stays in local storage and is only sent when you explicitly submit a request."}
            </p>
          </div>
        </div>

        <DialogFooter className="mt-7">
          <Button onClick={onConfirm}>Start chatting</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
