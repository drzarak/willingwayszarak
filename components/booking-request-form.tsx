"use client";

import { AlertTriangle, CheckCircle2, LoaderCircle, PhoneCall } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  BOOKING_AVAILABILITY_OPTIONS,
  BOOKING_BRANCH_OPTIONS,
  BOOKING_CONTACT_METHOD_OPTIONS,
  BOOKING_LANGUAGE_OPTIONS,
  BOOKING_RELATION_OPTIONS,
  BOOKING_SERVICE_OPTIONS,
  type BookingRequestPayload,
} from "@/lib/booking";

import { useSiteLanguage } from "@/components/site-language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type BookingFormState = BookingRequestPayload;

function createInitialFormState(isUrdu: boolean): BookingFormState {
  return {
    requesterName: "",
    patientName: "",
    relation: "self",
    phone: "",
    email: "",
    branchPreference: "first-available",
    serviceInterest: "consultation",
    contactMethod: "phone",
    contactLanguage: isUrdu ? "urdu" : "english",
    availability: "asap",
    notes: "",
    consent: false,
    website: "",
  };
}

export function BookingRequestForm() {
  const { isUrdu } = useSiteLanguage();
  const [form, setForm] = useState<BookingFormState>(() => createInitialFormState(false));
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const selectClassName =
    "flex h-12 w-full rounded-2xl border border-slate-200/90 bg-white/90 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/25";

  const introText = useMemo(
    () =>
      isUrdu
        ? "یہ فارم ولنگ ویز کی intake team تک براہ راست پہنچتا ہے۔ اگر معاملہ فوری ہو تو 0300-7413639 پر کال کریں۔"
        : "This form goes directly to the Willing Ways intake team. If the matter is urgent, call 0300-7413639.",
    [isUrdu],
  );

  useEffect(() => {
    setForm((current) => {
      if (
        current.requesterName ||
        current.patientName ||
        current.phone ||
        current.email ||
        current.notes
      ) {
        return current;
      }

      const nextLanguage = isUrdu ? "urdu" : "english";

      if (current.contactLanguage === nextLanguage) {
        return current;
      }

      return {
        ...current,
        contactLanguage: nextLanguage,
      };
    });
  }, [isUrdu]);

  function updateField<K extends keyof BookingFormState>(field: K, value: BookingFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (status === "submitting") {
      return;
    }

    setStatus("submitting");
    setMessage(null);

    try {
      const response = await fetch("/api/booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; ok?: boolean }
        | null;

      if (!response.ok) {
        throw new Error(
          data?.error ??
            (isUrdu
              ? "درخواست اس وقت بھیجی نہیں جا سکی۔"
              : "The booking request could not be sent right now."),
        );
      }

      setStatus("success");
      setMessage(
        isUrdu
          ? "آپ کی درخواست ولنگ ویز ٹیم کو بھیج دی گئی ہے۔ اگر معاملہ فوری ہے تو ابھی 0300-7413639 پر کال کریں۔"
          : "Your request has been sent to the Willing Ways team. If it is urgent, call 0300-7413639 right away.",
      );
      setForm(createInitialFormState(isUrdu));
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : isUrdu
            ? "درخواست اس وقت بھیجی نہیں جا سکی۔"
            : "The booking request could not be sent right now.",
      );
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
      <div className="rounded-[32px] border border-[#ead6dc] bg-white p-6 shadow-soft sm:p-8">
        <div className="section-kicker">
          {isUrdu ? "سیشن بکنگ درخواست" : "Session booking request"}
        </div>
        <h2
          className={`mt-4 text-3xl font-semibold text-[#3b1725] sm:text-4xl ${
            isUrdu ? "font-urdu text-right" : ""
          }`}
          dir={isUrdu ? "rtl" : "ltr"}
        >
          {isUrdu
            ? "اپنی تفصیل بھیجیں، ولنگ ویز ٹیم آپ سے رابطہ کرے گی"
            : "Send your details and the Willing Ways team can contact you"}
        </h2>
        <p
          className={`mt-4 text-base leading-8 text-[#5a3743] ${
            isUrdu ? "font-urdu text-right" : ""
          }`}
          dir={isUrdu ? "rtl" : "ltr"}
        >
          {introText}
        </p>

        <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <Label className={isUrdu ? "font-urdu text-right" : ""} htmlFor="requester-name">
                {isUrdu ? "آپ کا نام" : "Your name"}
              </Label>
              <Input
                id="requester-name"
                autoComplete="name"
                required
                value={form.requesterName}
                onChange={(event) => updateField("requesterName", event.target.value)}
                placeholder={isUrdu ? "مثلاً احمد خان" : "For example, Ahmed Khan"}
              />
            </label>

            <label className="grid gap-2">
              <Label className={isUrdu ? "font-urdu text-right" : ""} htmlFor="patient-name">
                {isUrdu ? "مریض کا نام (اختیاری)" : "Patient name (optional)"}
              </Label>
              <Input
                id="patient-name"
                autoComplete="name"
                value={form.patientName}
                onChange={(event) => updateField("patientName", event.target.value)}
                placeholder={isUrdu ? "اگر مختلف ہو" : "If different"}
              />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <Label className={isUrdu ? "font-urdu text-right" : ""} htmlFor="relation">
                {isUrdu ? "آپ کس حیثیت سے رابطہ کر رہے ہیں؟" : "How are you related to this request?"}
              </Label>
              <select
                id="relation"
                className={selectClassName}
                value={form.relation}
                onChange={(event) => updateField("relation", event.target.value as BookingFormState["relation"])}
              >
                {BOOKING_RELATION_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {isUrdu ? option.urdu : option.english}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <Label className={isUrdu ? "font-urdu text-right" : ""} htmlFor="phone">
                {isUrdu ? "رابطہ نمبر" : "Phone number"}
              </Label>
              <Input
                id="phone"
                autoComplete="tel"
                inputMode="tel"
                required
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                placeholder={isUrdu ? "0300 1234567" : "0300 1234567"}
              />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <Label className={isUrdu ? "font-urdu text-right" : ""} htmlFor="email">
                {isUrdu ? "ای میل (اختیاری)" : "Email (optional)"}
              </Label>
              <Input
                id="email"
                autoComplete="email"
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder={isUrdu ? "name@example.com" : "name@example.com"}
              />
            </label>

            <label className="grid gap-2">
              <Label className={isUrdu ? "font-urdu text-right" : ""} htmlFor="branch">
                {isUrdu ? "ترجیحی برانچ" : "Preferred branch"}
              </Label>
              <select
                id="branch"
                className={selectClassName}
                value={form.branchPreference}
                onChange={(event) =>
                  updateField("branchPreference", event.target.value as BookingFormState["branchPreference"])
                }
              >
                {BOOKING_BRANCH_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {isUrdu ? option.urdu : option.english}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <Label className={isUrdu ? "font-urdu text-right" : ""} htmlFor="service">
                {isUrdu ? "کس قسم کی مدد چاہیے؟" : "What kind of help do you need?"}
              </Label>
              <select
                id="service"
                className={selectClassName}
                value={form.serviceInterest}
                onChange={(event) =>
                  updateField("serviceInterest", event.target.value as BookingFormState["serviceInterest"])
                }
              >
                {BOOKING_SERVICE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {isUrdu ? option.urdu : option.english}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <Label className={isUrdu ? "font-urdu text-right" : ""} htmlFor="language">
                {isUrdu ? "رابطے کی زبان" : "Preferred language"}
              </Label>
              <select
                id="language"
                className={selectClassName}
                value={form.contactLanguage}
                onChange={(event) =>
                  updateField("contactLanguage", event.target.value as BookingFormState["contactLanguage"])
                }
              >
                {BOOKING_LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {isUrdu ? option.urdu : option.english}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <Label className={isUrdu ? "font-urdu text-right" : ""} htmlFor="contact-method">
                {isUrdu ? "ہم آپ سے کیسے رابطہ کریں؟" : "How should we reach you?"}
              </Label>
              <select
                id="contact-method"
                className={selectClassName}
                value={form.contactMethod}
                onChange={(event) =>
                  updateField("contactMethod", event.target.value as BookingFormState["contactMethod"])
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
              <Label className={isUrdu ? "font-urdu text-right" : ""} htmlFor="availability">
                {isUrdu ? "رابطے کا موزوں وقت" : "Best time to contact you"}
              </Label>
              <select
                id="availability"
                className={selectClassName}
                value={form.availability}
                onChange={(event) =>
                  updateField("availability", event.target.value as BookingFormState["availability"])
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

          <label className="grid gap-2">
            <Label className={isUrdu ? "font-urdu text-right" : ""} htmlFor="notes">
              {isUrdu ? "مختصر صورتحال" : "Short summary"}
            </Label>
            <Textarea
              id="notes"
              required
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder={
                isUrdu
                  ? "مختصراً بتائیں کہ مریض یا خاندان کس مدد کے لئے رابطہ کر رہا ہے۔"
                  : "Briefly explain what kind of help the patient or family needs."
              }
            />
          </label>

          <input
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
            value={form.website}
            onChange={(event) => updateField("website", event.target.value)}
            name="website"
          />

          <label
            className={`flex items-start gap-3 rounded-[24px] border border-[#ead6dc] bg-[#fff8fa] px-4 py-4 text-sm text-[#5a3743] ${
              isUrdu ? "font-urdu text-right" : ""
            }`}
            dir={isUrdu ? "rtl" : "ltr"}
          >
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(event) => updateField("consent", event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
            />
            <span>
              {isUrdu
                ? "میں رضامند ہوں کہ ولنگ ویز میری دی گئی معلومات استعمال کر کے اس درخواست کے بارے میں مجھ سے رابطہ کرے۔"
                : "I consent to Willing Ways using these details to contact me about this request."}
            </span>
          </label>

          {message ? (
            <div
              className={`rounded-[24px] border px-4 py-4 text-sm ${
                status === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                  : "border-rose-200 bg-rose-50 text-rose-900"
              } ${isUrdu ? "font-urdu text-right" : ""}`}
              dir={isUrdu ? "rtl" : "ltr"}
            >
              <div className="flex items-start gap-2">
                {status === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span>{message}</span>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={status === "submitting" || !form.consent} className="h-12 px-6 text-base">
              {status === "submitting" ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  {isUrdu ? "درخواست بھیجی جا رہی ہے" : "Sending request"}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {isUrdu ? "درخواست بھیجیں" : "Send booking request"}
                </>
              )}
            </Button>

            <a href="tel:+923007413639" className="site-action-link">
              <PhoneCall className="h-4 w-4" />
              0300 7413639
            </a>
          </div>
        </form>
      </div>

      <div className="grid gap-5">
        <div className="rounded-[32px] border border-[#ead6dc] bg-white p-6 shadow-soft sm:p-8">
          <div className="section-kicker">
            {isUrdu ? "کیا ہوگا؟" : "What happens next?"}
          </div>
          <div className="mt-5 grid gap-4">
            {[
              {
                english: "Your request is saved for the Willing Ways intake team.",
                urdu: "آپ کی درخواست ولنگ ویز کی intake team تک محفوظ ہو جاتی ہے۔",
              },
              {
                english: "The team can review your preferred branch, language, and service need.",
                urdu: "ٹیم آپ کی ترجیحی برانچ، زبان اور مطلوبہ سروس کا جائزہ لے سکتی ہے۔",
              },
              {
                english: "If the matter is urgent, calling the helpline remains the fastest option.",
                urdu: "اگر معاملہ فوری ہے تو ہیلپ لائن پر کال کرنا اب بھی سب سے تیز راستہ ہے۔",
              },
            ].map((item) => (
              <div key={item.english} className="flex items-start gap-3 rounded-[22px] border border-[#ead6dc] bg-[#fff8fa] px-4 py-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div
                  className={`text-base leading-7 text-[#5a3743] ${isUrdu ? "font-urdu text-right" : ""}`}
                  dir={isUrdu ? "rtl" : "ltr"}
                >
                  {isUrdu ? item.urdu : item.english}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-[#ead6dc] bg-[#fff8fa] p-6 shadow-soft sm:p-8">
          <div className="section-kicker">
            {isUrdu ? "فوری مدد" : "Immediate help"}
          </div>
          <div
            className={`mt-4 text-2xl font-semibold text-[#3b1725] ${
              isUrdu ? "font-urdu text-right" : ""
            }`}
            dir={isUrdu ? "rtl" : "ltr"}
          >
            {isUrdu ? "اگر معاملہ ہنگامی ہو" : "If the situation is urgent"}
          </div>
          <p
            className={`mt-3 text-base leading-8 text-[#5a3743] ${
              isUrdu ? "font-urdu text-right" : ""
            }`}
            dir={isUrdu ? "rtl" : "ltr"}
          >
            {isUrdu
              ? "شدید withdrawal، self-harm، overdose یا violent crisis کی صورت میں فوراً ہسپتال جائیں یا ولنگ ویز ہیلپ لائن پر رابطہ کریں۔"
              : "For severe withdrawal, self-harm, overdose, or a violent crisis, go to the nearest hospital immediately or contact the Willing Ways helpline."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="tel:+923007413639" className="site-cta-button">
              <PhoneCall className="h-4 w-4" />
              0300 7413639
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
