"use client";

import { AlertTriangle, CheckCircle2, LoaderCircle, RefreshCw, Send } from "lucide-react";

import {
  BOOKING_AVAILABILITY_OPTIONS,
  BOOKING_BRANCH_OPTIONS,
  BOOKING_CONTACT_METHOD_OPTIONS,
  BOOKING_LANGUAGE_OPTIONS,
  BOOKING_RELATION_OPTIONS,
  BOOKING_SERVICE_OPTIONS,
  type BookingRequestPayload,
} from "@/lib/booking";
import type { ChatLanguage } from "@/lib/chat";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface VoiceIntakeReviewProps {
  draft: BookingRequestPayload;
  language: ChatLanguage;
  message: string | null;
  onFieldChange: <K extends keyof BookingRequestPayload>(
    field: K,
    value: BookingRequestPayload[K],
  ) => void;
  onRefreshDraft: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  preparing: boolean;
  status: "idle" | "preparing" | "ready" | "submitting" | "success" | "error";
}

export function VoiceIntakeReview({
  draft,
  language,
  message,
  onFieldChange,
  onRefreshDraft,
  onSubmit,
  preparing,
  status,
}: VoiceIntakeReviewProps) {
  const isUrdu = language === "urdu";
  const aiIntake = draft.aiIntake;
  const selectClassName =
    "flex h-12 w-full rounded-2xl border border-[#ead6dc] bg-white px-4 py-3 text-sm text-[#3b1725] shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/20";

  return (
    <section className="mt-4 rounded-[28px] border border-[#ead6dc] bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div
            className={`text-xs font-semibold uppercase tracking-[0.18em] text-[#8a4b5d] ${
              isUrdu ? "font-urdu text-right normal-case" : ""
            }`}
            dir={isUrdu ? "rtl" : "ltr"}
          >
            {isUrdu ? "اے آئی handoff review" : "AI handoff review"}
          </div>
          <h3
            className={`mt-2 text-2xl font-semibold text-[#3b1725] ${
              isUrdu ? "font-urdu text-right" : ""
            }`}
            dir={isUrdu ? "rtl" : "ltr"}
          >
            {isUrdu
              ? "اے آئی نے آپ کی بات کو Willing Ways ٹیم کے لئے ترتیب دے دیا ہے"
              : "The AI has organized your story into a team-ready handoff"}
          </h3>
          <p
            className={`mt-2 max-w-3xl text-sm leading-7 text-[#5a3743] ${
              isUrdu ? "font-urdu text-right" : ""
            }`}
            dir={isUrdu ? "rtl" : "ltr"}
          >
            {isUrdu
              ? "نیچے summary اور contact details چیک کریں۔ فون نمبر یا ای میل آواز میں غلط سنائی دے سکتی ہے، اس لئے بھیجنے سے پہلے ضرور تصدیق کریں۔"
              : "Please review the summary and contact details below. Phone numbers or email addresses can be misheard in voice, so confirm them before sending."}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          disabled={preparing || status === "submitting"}
          onClick={onRefreshDraft}
        >
          {preparing ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {isUrdu ? "summary دوبارہ بنائیں" : "Refresh summary"}
        </Button>
      </div>

      {message ? (
        <div
          className={`mt-4 flex items-start gap-3 rounded-[22px] border px-4 py-3 text-sm ${
            status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : status === "error"
                ? "border-rose-200 bg-rose-50 text-rose-900"
                : "border-[#ead6dc] bg-[#fff8fa] text-[#5a3743]"
          } ${isUrdu ? "font-urdu text-right" : ""}`}
          dir={isUrdu ? "rtl" : "ltr"}
        >
          {status === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : status === "error" ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <LoaderCircle className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
          )}
          <span>{message}</span>
        </div>
      ) : null}

      {aiIntake ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.06fr_0.94fr]">
          <div className="grid gap-4">
            <div className="rounded-[24px] border border-[#ead6dc] bg-[#fff8fa] p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a4b5d]">
                {isUrdu ? "ترتیب دی گئی کہانی" : "Streamlined story"}
              </div>
              <div
                className={`mt-3 whitespace-pre-line text-sm leading-7 text-[#4b2934] ${
                  isUrdu ? "font-urdu text-right" : ""
                }`}
                dir={isUrdu ? "rtl" : "ltr"}
              >
                {draft.notes}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] border border-[#ead6dc] bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a4b5d]">
                  {isUrdu ? "اگلا مناسب قدم" : "Suggested next step"}
                </div>
                <div
                  className={`mt-3 text-sm leading-7 text-[#4b2934] ${
                    isUrdu ? "font-urdu text-right" : ""
                  }`}
                  dir={isUrdu ? "rtl" : "ltr"}
                >
                  {aiIntake.nextStepRecommendation}
                </div>
              </div>

              <div className="rounded-[24px] border border-[#ead6dc] bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a4b5d]">
                  {isUrdu ? "ابھی کیا اہم ہے" : "What matters now"}
                </div>
                <div
                  className={`mt-3 text-sm leading-7 text-[#4b2934] ${
                    isUrdu ? "font-urdu text-right" : ""
                  }`}
                  dir={isUrdu ? "rtl" : "ltr"}
                >
                  {aiIntake.presentingProblem}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  englishTitle: "Before intervention",
                  urduTitle: "intervention سے پہلے",
                  items: aiIntake.interventionPreparation,
                },
                {
                  englishTitle: "What to expect",
                  urduTitle: "علاج میں کیا توقع رکھیں",
                  items: aiIntake.treatmentExpectations,
                },
                {
                  englishTitle: "How family can follow along",
                  urduTitle: "خاندان کیسے ساتھ چلے",
                  items: aiIntake.familyFollowAlong,
                },
              ].map((section) => (
                <div
                  key={section.englishTitle}
                  className="rounded-[24px] border border-[#ead6dc] bg-[#fff8fa] p-4"
                >
                  <div
                    className={`text-xs font-semibold uppercase tracking-[0.16em] text-[#8a4b5d] ${
                      isUrdu ? "font-urdu normal-case text-right" : ""
                    }`}
                    dir={isUrdu ? "rtl" : "ltr"}
                  >
                    {isUrdu ? section.urduTitle : section.englishTitle}
                  </div>
                  <div className="mt-3 grid gap-2">
                    {section.items.length > 0 ? (
                      section.items.map((item) => (
                        <div
                          key={item}
                          className={`rounded-2xl border border-[#ead6dc] bg-white px-3 py-3 text-sm leading-6 text-[#4b2934] ${
                            isUrdu ? "font-urdu text-right" : ""
                          }`}
                          dir={isUrdu ? "rtl" : "ltr"}
                        >
                          {item}
                        </div>
                      ))
                    ) : (
                      <div
                        className={`rounded-2xl border border-[#ead6dc] bg-white px-3 py-3 text-sm leading-6 text-[#7a5a64] ${
                          isUrdu ? "font-urdu text-right" : ""
                        }`}
                        dir={isUrdu ? "rtl" : "ltr"}
                      >
                        {isUrdu
                          ? "AI نے ابھی اس حصے کے لئے کوئی واضح نکتہ نہیں نکالا۔"
                          : "The AI did not identify a clear point for this section yet."}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {aiIntake.missingInformation.length > 0 ? (
              <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4">
                <div
                  className={`text-xs font-semibold uppercase tracking-[0.16em] text-amber-900 ${
                    isUrdu ? "font-urdu normal-case text-right" : ""
                  }`}
                  dir={isUrdu ? "rtl" : "ltr"}
                >
                  {isUrdu ? "ابھی کن باتوں کی تصدیق بہتر ہوگی" : "Best details to confirm before sending"}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {aiIntake.missingInformation.map((item) => (
                    <span
                      key={item}
                      className={`rounded-full border border-amber-200 bg-white px-3 py-2 text-xs text-amber-950 ${
                        isUrdu ? "font-urdu" : ""
                      }`}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <form className="grid gap-4" onSubmit={onSubmit}>
            <div className="grid gap-4 rounded-[24px] border border-[#ead6dc] bg-white p-4">
              <div
                className={`text-xs font-semibold uppercase tracking-[0.16em] text-[#8a4b5d] ${
                  isUrdu ? "font-urdu normal-case text-right" : ""
                }`}
                dir={isUrdu ? "rtl" : "ltr"}
              >
                {isUrdu ? "رابطے کی تصدیق" : "Confirm contact details"}
              </div>

              <label className="grid gap-2">
                <Label className={isUrdu ? "font-urdu text-right" : ""}>
                  {isUrdu ? "آپ کا نام" : "Your name"}
                </Label>
                <Input
                  value={draft.requesterName}
                  onChange={(event) => onFieldChange("requesterName", event.target.value)}
                />
              </label>

              <label className="grid gap-2">
                <Label className={isUrdu ? "font-urdu text-right" : ""}>
                  {isUrdu ? "مریض کا نام (اختیاری)" : "Patient name (optional)"}
                </Label>
                <Input
                  value={draft.patientName ?? ""}
                  onChange={(event) => onFieldChange("patientName", event.target.value)}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <Label className={isUrdu ? "font-urdu text-right" : ""}>
                    {isUrdu ? "آپ کی حیثیت" : "Your role"}
                  </Label>
                  <select
                    className={selectClassName}
                    value={draft.relation}
                    onChange={(event) => onFieldChange("relation", event.target.value as BookingRequestPayload["relation"])}
                  >
                    {BOOKING_RELATION_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {isUrdu ? option.urdu : option.english}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <Label className={isUrdu ? "font-urdu text-right" : ""}>
                    {isUrdu ? "رابطہ نمبر" : "Phone number"}
                  </Label>
                  <Input
                    value={draft.phone}
                    onChange={(event) => onFieldChange("phone", event.target.value)}
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <Label className={isUrdu ? "font-urdu text-right" : ""}>
                  {isUrdu ? "ای میل (اختیاری)" : "Email (optional)"}
                </Label>
                <Input
                  value={draft.email ?? ""}
                  onChange={(event) => onFieldChange("email", event.target.value)}
                />
              </label>
            </div>

            <div className="grid gap-4 rounded-[24px] border border-[#ead6dc] bg-[#fff8fa] p-4">
              <div
                className={`text-xs font-semibold uppercase tracking-[0.16em] text-[#8a4b5d] ${
                  isUrdu ? "font-urdu normal-case text-right" : ""
                }`}
                dir={isUrdu ? "rtl" : "ltr"}
              >
                {isUrdu ? "Follow-up preferences" : "Follow-up preferences"}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <Label className={isUrdu ? "font-urdu text-right" : ""}>
                    {isUrdu ? "ترجیحی برانچ" : "Preferred branch"}
                  </Label>
                  <select
                    className={selectClassName}
                    value={draft.branchPreference}
                    onChange={(event) =>
                      onFieldChange("branchPreference", event.target.value as BookingRequestPayload["branchPreference"])
                    }
                  >
                    {BOOKING_BRANCH_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {isUrdu ? option.urdu : option.english}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <Label className={isUrdu ? "font-urdu text-right" : ""}>
                    {isUrdu ? "کس مدد کی ضرورت ہے" : "Help needed"}
                  </Label>
                  <select
                    className={selectClassName}
                    value={draft.serviceInterest}
                    onChange={(event) =>
                      onFieldChange("serviceInterest", event.target.value as BookingRequestPayload["serviceInterest"])
                    }
                  >
                    {BOOKING_SERVICE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {isUrdu ? option.urdu : option.english}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="grid gap-2">
                  <Label className={isUrdu ? "font-urdu text-right" : ""}>
                    {isUrdu ? "رابطے کا طریقہ" : "Contact method"}
                  </Label>
                  <select
                    className={selectClassName}
                    value={draft.contactMethod}
                    onChange={(event) =>
                      onFieldChange("contactMethod", event.target.value as BookingRequestPayload["contactMethod"])
                    }
                  >
                    {BOOKING_CONTACT_METHOD_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {isUrdu ? option.urdu : option.english}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <Label className={isUrdu ? "font-urdu text-right" : ""}>
                    {isUrdu ? "زبان" : "Language"}
                  </Label>
                  <select
                    className={selectClassName}
                    value={draft.contactLanguage}
                    onChange={(event) =>
                      onFieldChange("contactLanguage", event.target.value as BookingRequestPayload["contactLanguage"])
                    }
                  >
                    {BOOKING_LANGUAGE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {isUrdu ? option.urdu : option.english}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <Label className={isUrdu ? "font-urdu text-right" : ""}>
                    {isUrdu ? "بہترین وقت" : "Best time"}
                  </Label>
                  <select
                    className={selectClassName}
                    value={draft.availability}
                    onChange={(event) =>
                      onFieldChange("availability", event.target.value as BookingRequestPayload["availability"])
                    }
                  >
                    {BOOKING_AVAILABILITY_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {isUrdu ? option.urdu : option.english}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="grid gap-3 rounded-[24px] border border-[#ead6dc] bg-white p-4">
              <Label className={isUrdu ? "font-urdu text-right" : ""}>
                {isUrdu ? "ولنگ ویز ٹیم کے لئے summary" : "Summary for the Willing Ways team"}
              </Label>
              <Textarea
                value={draft.notes}
                onChange={(event) => onFieldChange("notes", event.target.value)}
                className="min-h-[150px] border-[#ead6dc] bg-[#fffdfd] text-[15px] leading-7"
              />

              <label
                className={`flex items-start gap-3 rounded-2xl border border-[#ead6dc] bg-[#fff8fa] px-4 py-3 text-sm leading-7 text-[#4b2934] ${
                  isUrdu ? "font-urdu flex-row-reverse text-right" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={draft.consent}
                  onChange={(event) => onFieldChange("consent", event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[#d9bec6] text-primary focus:ring-primary/25"
                />
                <span>
                  {isUrdu
                    ? "میں رضامند ہوں کہ یہ summary اور contact details ولنگ ویز ٹیم تک follow-up کے لئے بھیجی جائیں۔"
                    : "I consent to send this summary and these contact details to the Willing Ways team for follow-up."}
                </span>
              </label>

              <Button type="submit" className="h-12 text-base" disabled={status === "submitting" || preparing}>
                {status === "submitting" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isUrdu ? "ولنگ ویز ٹیم کو بھیجیں" : "Send to Willing Ways team"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
