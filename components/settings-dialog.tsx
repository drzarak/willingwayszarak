"use client";

import { Eye, EyeOff, KeyRound, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import type { AppSettings, ModelId } from "@/lib/chat";
import { MODEL_OPTIONS } from "@/lib/chat";

import { useSiteLanguage } from "@/components/site-language-provider";
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
  const { isUrdu } = useSiteLanguage();
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
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#fff4f7] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {isUrdu ? "runtime settings" : "Runtime settings"}
          </div>
          <DialogTitle className={isUrdu ? "font-urdu text-right" : ""}>
            {isUrdu ? "OpenAI key اور model" : "OpenAI key and model"}
          </DialogTitle>
          <DialogDescription className={isUrdu ? "font-urdu text-right" : ""}>
            {serverKeyConfigured
              ? isUrdu
                ? "اس deployment میں پہلے سے server-side OPENAI_API_KEY موجود ہے۔ نیچے browser key صرف local override کے لئے اختیاری ہے۔"
                : "This deployment already has a server-side OPENAI_API_KEY. The browser key below is optional and only useful as a local override."
              : isUrdu
                ? "local testing کے لئے browser key شامل کریں، یا deployed server پر OPENAI_API_KEY configure کرنے کے بعد اسے خالی چھوڑ دیں۔"
                : "Add a browser key for local testing, or leave this blank after you configure OPENAI_API_KEY on the deployed server."}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-5">
          <div
            className={`rounded-[24px] border p-4 text-sm leading-6 ${
              serverKeyConfigured
                ? "border-emerald-200 bg-emerald-50/90 text-emerald-900"
                : "border-[#ead6dc] bg-[#fff4f7] text-[#5a3743]"
            }`}
          >
            {serverKeyConfigured
              ? isUrdu
                ? "Server-side OpenAI access configured ہے۔ اس deployment پر صارف browser key دیے بغیر chat کر سکتے ہیں۔"
                : "Server-side OpenAI access is configured. Users on this deployment can chat without entering a browser key."
              : isUrdu
                ? "Server-side OpenAI access ابھی configured نہیں ہے۔ Vercel پر project dashboard میں OPENAI_API_KEY شامل کریں اور redeploy کریں، یا عارضی طور پر browser key paste کریں۔"
                : "Server-side OpenAI access is not configured yet. For Vercel, add OPENAI_API_KEY in the project dashboard and redeploy, or paste a browser key temporarily."}
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key" className={isUrdu ? "font-urdu" : ""}>
              {isUrdu
                ? `OpenAI API key ${serverKeyConfigured ? "(optional override)" : ""}`
                : `OpenAI API key ${serverKeyConfigured ? "(optional override)" : ""}`}
            </Label>
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
            <Label htmlFor="model-id" className={isUrdu ? "font-urdu" : ""}>
              {isUrdu ? "Model" : "Model"}
            </Label>
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

          <div className="rounded-[24px] border border-[#ead6dc] bg-[#fff4f7] p-4 text-sm leading-6 text-[#5a3743]">
            <span className={isUrdu ? "font-urdu" : ""} dir={isUrdu ? "rtl" : "ltr"}>
              {isUrdu
                ? "Chat history، منتخب model اور language/mode preferences local storage میں محفوظ رہتے ہیں تاکہ اسی browser پر refresh کے بعد بھی موجودہ UX برقرار رہے۔"
                : "Chat history, selected model, and language/mode preferences stay in local storage so the current UX remains intact across refreshes on the same browser."}
            </span>
          </div>
        </div>

        <DialogFooter className="mt-7">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {isUrdu ? "منسوخ" : "Cancel"}
          </Button>
          <Button
            onClick={() =>
              onSave({
                apiKey: draftApiKey.trim(),
                modelId: draftModelId,
              })
            }
          >
            {isUrdu ? "settings محفوظ کریں" : "Save settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
