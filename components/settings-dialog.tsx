"use client";

import { Eye, EyeOff, KeyRound, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import type { AppSettings, ModelId } from "@/lib/chat";
import { MODEL_OPTIONS } from "@/lib/chat";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverKeyConfigured: boolean;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

export function SettingsDialog({
  open,
  onOpenChange,
  serverKeyConfigured,
  settings,
  onSave,
}: SettingsDialogProps) {
  const [draftApiKey, setDraftApiKey] = useState(settings.apiKey);
  const [draftModelId, setDraftModelId] = useState<ModelId>(settings.modelId);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraftApiKey(settings.apiKey);
    setDraftModelId(settings.modelId);
  }, [open, settings.apiKey, settings.modelId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Runtime settings
          </div>
          <DialogTitle>OpenAI key and model</DialogTitle>
          <DialogDescription>
            {serverKeyConfigured
              ? "This deployment already has a server-side OPENAI_API_KEY. The browser key below is optional and only useful as a local override."
              : "Add a browser key for local testing, or leave this blank after you configure OPENAI_API_KEY on the deployed server."}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-5">
          <div
            className={`rounded-[24px] border p-4 text-sm leading-6 ${
              serverKeyConfigured
                ? "border-emerald-200 bg-emerald-50/90 text-emerald-900"
                : "border-blue-100 bg-blue-50/80 text-slate-600"
            }`}
          >
            {serverKeyConfigured
              ? "Server-side OpenAI access is configured. Users on this deployment can chat without entering a browser key."
              : "Server-side OpenAI access is not configured yet. For Vercel, add OPENAI_API_KEY in the project dashboard and redeploy, or paste a browser key temporarily."}
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key">OpenAI API key {serverKeyConfigured ? "(optional override)" : ""}</Label>
            <div className="relative">
              <Input
                id="api-key"
                autoComplete="off"
                placeholder="sk-..."
                type={showApiKey ? "text" : "password"}
                value={draftApiKey}
                onChange={(event) => setDraftApiKey(event.target.value)}
                className="pr-24"
              />
              <div className="absolute inset-y-0 right-3 flex items-center gap-1">
                <KeyRound className="h-4 w-4 text-slate-400" />
                <button
                  type="button"
                  className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  onClick={() => setShowApiKey((current) => !current)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="sr-only">Toggle API key visibility</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model-id">Model</Label>
            <select
              id="model-id"
              className="flex h-12 w-full rounded-2xl border border-slate-200/90 bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none ring-0 transition focus:border-primary/35"
              value={draftModelId}
              onChange={(event) => setDraftModelId(event.target.value as ModelId)}
            >
              {MODEL_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-[24px] border border-blue-100 bg-blue-50/80 p-4 text-sm leading-6 text-slate-600">
            Chat history, selected model, and language/mode preferences stay in local storage so
            the current UX remains intact across refreshes on the same browser.
          </div>
        </div>

        <DialogFooter className="mt-7">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSave({
                apiKey: draftApiKey.trim(),
                modelId: draftModelId,
              })
            }
          >
            Save settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
