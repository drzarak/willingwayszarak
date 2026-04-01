import type { VoiceCallFocusId } from "@/lib/chat";
import type { FamilyTrainingLessonId } from "@/lib/family-training";

export type RecoveryProgramId =
  | "family-first-response"
  | "post-rehab-30-day"
  | "cravings-rescue"
  | "relapse-warning-radar"
  | "intervention-readiness";

export interface RecoveryProgram {
  id: RecoveryProgramId;
  englishLabel: string;
  urduLabel: string;
  englishTagline: string;
  urduTagline: string;
  englishAudience: string;
  urduAudience: string;
  englishCadence: string;
  urduCadence: string;
  englishOutcome: string;
  urduOutcome: string;
  englishFocusAreas: string[];
  urduFocusAreas: string[];
  englishNextActions: string[];
  urduNextActions: string[];
  voiceFocus: VoiceCallFocusId;
  familyLessonId?: FamilyTrainingLessonId;
}

export const RECOVERY_PROGRAMS: RecoveryProgram[] = [
  {
    id: "family-first-response",
    englishLabel: "Family first response",
    urduLabel: "خاندان کا پہلا مؤثر قدم",
    englishTagline: "Turn panic into one calm family plan before tonight gets worse.",
    urduTagline: "آج رات کی گھبراہٹ کو ایک پرسکون خاندانی منصوبے میں بدلیں۔",
    englishAudience: "For families facing denial, repeated conflict, or enabling at home.",
    urduAudience: "ان خاندانوں کے لئے جو انکار، لڑائی یا enabling کا سامنا کر رہے ہوں۔",
    englishCadence: "3 to 5 minute family coaching start, then a clear next step.",
    urduCadence: "3 سے 5 منٹ کی family coaching، پھر واضح اگلا قدم۔",
    englishOutcome: "Leaves the family with one script, one boundary, and one treatment ask.",
    urduOutcome: "خاندان کو ایک script، ایک boundary اور ایک treatment ask کے ساتھ چھوڑتا ہے۔",
    englishFocusAreas: [
      "Denial without argument",
      "Boundary script",
      "Lead family spokesperson",
    ],
    urduFocusAreas: [
      "بغیر بحث denial کو handle کرنا",
      "boundary script",
      "lead family spokesperson",
    ],
    englishNextActions: [
      "Rehearse one calm conversation",
      "Set one family stand for 7 days",
      "Escalate to intervention planning if needed",
    ],
    urduNextActions: [
      "ایک پرسکون گفتگو کی rehearsal",
      "سات دن کے لئے ایک family stand",
      "ضرورت ہو تو intervention planning",
    ],
    voiceFocus: "family-coach",
    familyLessonId: "practice-conversation",
  },
  {
    id: "post-rehab-30-day",
    englishLabel: "Post-rehab 30 day follow-through",
    urduLabel: "ریحاب کے بعد 30 دن کا follow-through",
    englishTagline: "Support the home return with structure before old patterns take over.",
    urduTagline: "گھر واپسی کے بعد structure بنائیں، اس سے پہلے کہ پرانے patterns واپس آ جائیں۔",
    englishAudience: "For patients and families in the first days or weeks after discharge.",
    urduAudience: "discharge کے بعد پہلے دنوں اور ہفتوں کے لئے۔",
    englishCadence: "Daily structure today, then follow-up checkpoints through the month.",
    urduCadence: "آج daily structure، پھر پورے مہینے follow-up checkpoints۔",
    englishOutcome: "Creates a home plan around sleep, support, follow-up, and risky hours.",
    urduOutcome: "sleep، support، follow-up اور risky hours کے گرد home plan بناتا ہے۔",
    englishFocusAreas: [
      "Discharge-day home plan",
      "High-risk hours",
      "Family follow-along",
    ],
    urduFocusAreas: [
      "discharge-day home plan",
      "high-risk hours",
      "family follow-along",
    ],
    englishNextActions: [
      "Choose one daily anchor routine",
      "Name one risky time window",
      "Confirm the first follow-up touchpoint",
    ],
    urduNextActions: [
      "ایک daily anchor routine طے کریں",
      "ایک risky time window نام دیں",
      "پہلا follow-up touchpoint طے کریں",
    ],
    voiceFocus: "general-support",
  },
  {
    id: "cravings-rescue",
    englishLabel: "Cravings rescue",
    urduLabel: "cravings rescue",
    englishTagline: "Slow the craving wave down and move the person toward one safer action.",
    urduTagline: "craving کی لہر کو سست کریں اور ایک محفوظ قدم کی طرف آئیں۔",
    englishAudience: "For a patient or family member facing immediate urge, stress, or instability.",
    urduAudience: "اس مریض یا خاندان کے لئے جسے ابھی urge، stress یا instability ہو۔",
    englishCadence: "Fast exercise now, then a short relapse-prevention plan.",
    urduCadence: "ابھی ایک فوری exercise، پھر مختصر relapse-prevention plan۔",
    englishOutcome: "Leaves the caller calmer, more specific, and less likely to act impulsively.",
    urduOutcome: "کالر کو زیادہ calm، واضح اور کم impulsive چھوڑتا ہے۔",
    englishFocusAreas: [
      "Urge surfing",
      "HALT reset",
      "Trigger mapping",
    ],
    urduFocusAreas: [
      "urge surfing",
      "HALT reset",
      "trigger mapping",
    ],
    englishNextActions: [
      "Do one 60-second exercise",
      "Leave one risky place or person",
      "Create one same-day support move",
    ],
    urduNextActions: [
      "ایک 60-second exercise کریں",
      "ایک risky جگہ یا شخص سے دور ہوں",
      "اسی دن کی ایک support move طے کریں",
    ],
    voiceFocus: "general-support",
  },
  {
    id: "relapse-warning-radar",
    englishLabel: "Relapse warning radar",
    urduLabel: "relapse warning radar",
    englishTagline: "Catch the warning signs early and route the case before a full relapse cycle.",
    urduTagline: "warning signs جلدی پکڑیں اور case کو مکمل relapse cycle سے پہلے route کریں۔",
    englishAudience: "For families or patients noticing secrecy, anger, cravings, isolation, or dropped follow-up.",
    urduAudience: "ان مریضوں یا خاندانوں کے لئے جو secrecy، anger، cravings، isolation یا dropped follow-up دیکھ رہے ہوں۔",
    englishCadence: "Quick risk check now, then same-day or 24-hour follow-up planning.",
    urduCadence: "ابھی quick risk check، پھر same-day یا 24-hour follow-up planning۔",
    englishOutcome: "Turns vague worry into a risk picture, follow-up window, and clear escalation rule.",
    urduOutcome: "غیر واضح تشویش کو risk picture، follow-up window اور escalation rule میں بدلتا ہے۔",
    englishFocusAreas: [
      "Warning sign check",
      "Lapse versus full relapse",
      "Escalation timing",
    ],
    urduFocusAreas: [
      "warning sign check",
      "lapse اور full relapse کا فرق",
      "escalation timing",
    ],
    englishNextActions: [
      "List the strongest warning signs",
      "Choose today’s escalation threshold",
      "Set the next human follow-up window",
    ],
    urduNextActions: [
      "سب سے strong warning signs لکھیں",
      "آج کا escalation threshold طے کریں",
      "اگلی human follow-up window طے کریں",
    ],
    voiceFocus: "general-support",
  },
  {
    id: "intervention-readiness",
    englishLabel: "Intervention readiness",
    urduLabel: "intervention readiness",
    englishTagline: "Prepare the family system before approaching a resistant loved one.",
    urduTagline: "مزاحمت کرنے والے loved one سے پہلے family system کو تیار کریں۔",
    englishAudience: "For families who know help is needed but the patient is not agreeing.",
    urduAudience: "ان خاندانوں کے لئے جو جانتے ہیں کہ مدد چاہیے مگر مریض تیار نہیں۔",
    englishCadence: "One structured intervention-prep call with immediate family homework.",
    urduCadence: "ایک structured intervention-prep call اور فوری family homework۔",
    englishOutcome: "Aligns the family around one spokesperson, one ask, and one treatment path.",
    urduOutcome: "خاندان کو ایک spokesperson، ایک ask اور ایک treatment path پر align کرتا ہے۔",
    englishFocusAreas: [
      "Who speaks",
      "What the family stops rescuing",
      "Immediate treatment ask",
    ],
    urduFocusAreas: [
      "کون بولے گا",
      "خاندان rescue کہاں روکے گا",
      "فوری treatment ask",
    ],
    englishNextActions: [
      "Choose one spokesperson",
      "Write one treatment ask",
      "Prepare safety facts before the intervention",
    ],
    urduNextActions: [
      "ایک spokesperson منتخب کریں",
      "ایک treatment ask لکھیں",
      "intervention سے پہلے safety facts تیار کریں",
    ],
    voiceFocus: "family-coach",
    familyLessonId: "intervention-preparation",
  },
];

export const HOME_RECOVERY_PROGRAM_IDS: RecoveryProgramId[] = [
  "family-first-response",
  "post-rehab-30-day",
  "relapse-warning-radar",
];

export function getRecoveryProgram(id: RecoveryProgramId | null | undefined) {
  if (!id) {
    return null;
  }

  return RECOVERY_PROGRAMS.find((program) => program.id === id) ?? null;
}
