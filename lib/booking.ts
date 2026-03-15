export const NOTION_API_VERSION = "2026-03-11";

export const BOOKING_RELATION_OPTIONS = [
  { id: "self", english: "I am the patient", urdu: "میں خود مریض ہوں" },
  { id: "family", english: "I am a family member", urdu: "میں خاندان کا فرد ہوں" },
  { id: "doctor", english: "I am a doctor or referrer", urdu: "میں ڈاکٹر یا ریفرر ہوں" },
  { id: "other", english: "Other", urdu: "دیگر" },
] as const;

export const BOOKING_BRANCH_OPTIONS = [
  { id: "first-available", english: "First available team", urdu: "جو ٹیم پہلے دستیاب ہو" },
  { id: "lahore", english: "Lahore", urdu: "لاہور" },
  { id: "karachi-clifton", english: "Karachi Clifton", urdu: "کراچی کلفٹن" },
  { id: "karachi-nazimabad", english: "Karachi Nazimabad", urdu: "کراچی ناظم آباد" },
  { id: "islamabad", english: "Islamabad", urdu: "اسلام آباد" },
] as const;

export const BOOKING_SERVICE_OPTIONS = [
  { id: "consultation", english: "General consultation", urdu: "عمومی مشاورت" },
  { id: "rehab", english: "Rehab or admission guidance", urdu: "ریحاب یا داخلے کی رہنمائی" },
  { id: "psychiatric", english: "Psychiatric consultation", urdu: "نفسیاتی مشاورت" },
  { id: "family-intervention", english: "Family intervention", urdu: "فیملی انٹروینشن" },
  { id: "follow-up", english: "Follow-up or relapse support", urdu: "فالو اپ یا relapse سپورٹ" },
] as const;

export const BOOKING_CONTACT_METHOD_OPTIONS = [
  { id: "phone", english: "Phone call", urdu: "فون کال" },
  { id: "whatsapp", english: "WhatsApp", urdu: "واٹس ایپ" },
  { id: "email", english: "Email", urdu: "ای میل" },
] as const;

export const BOOKING_LANGUAGE_OPTIONS = [
  { id: "urdu", english: "Urdu", urdu: "اردو" },
  { id: "english", english: "English", urdu: "انگریزی" },
  { id: "punjabi", english: "Punjabi (Pakistan)", urdu: "پنجابی (پاکستان)" },
  { id: "no-preference", english: "No preference", urdu: "کوئی خاص ترجیح نہیں" },
] as const;

export const BOOKING_AVAILABILITY_OPTIONS = [
  { id: "asap", english: "As soon as possible", urdu: "جتنی جلد ممکن ہو" },
  { id: "morning", english: "Morning", urdu: "صبح" },
  { id: "afternoon", english: "Afternoon", urdu: "دوپہر" },
  { id: "evening", english: "Evening", urdu: "شام" },
  { id: "this-week", english: "Any time this week", urdu: "اس ہفتے کسی بھی وقت" },
] as const;

export type BookingRelationId = (typeof BOOKING_RELATION_OPTIONS)[number]["id"];
export type BookingBranchId = (typeof BOOKING_BRANCH_OPTIONS)[number]["id"];
export type BookingServiceId = (typeof BOOKING_SERVICE_OPTIONS)[number]["id"];
export type BookingContactMethodId =
  (typeof BOOKING_CONTACT_METHOD_OPTIONS)[number]["id"];
export type BookingLanguageId = (typeof BOOKING_LANGUAGE_OPTIONS)[number]["id"];
export type BookingAvailabilityId =
  (typeof BOOKING_AVAILABILITY_OPTIONS)[number]["id"];

export interface BookingRequestPayload {
  requesterName: string;
  patientName?: string;
  relation: BookingRelationId;
  phone: string;
  email?: string;
  branchPreference: BookingBranchId;
  serviceInterest: BookingServiceId;
  contactMethod: BookingContactMethodId;
  contactLanguage: BookingLanguageId;
  availability: BookingAvailabilityId;
  notes: string;
  consent: boolean;
  website?: string;
}

export const BOOKING_MAX_LENGTHS = {
  requesterName: 120,
  patientName: 120,
  phone: 40,
  email: 160,
  notes: 1500,
} as const;

export function getBookingOptionLabel(
  options: ReadonlyArray<{ id: string; english: string }>,
  id: string,
) {
  return options.find((option) => option.id === id)?.english ?? id;
}
