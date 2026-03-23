export type FamilyTrainingLessonId =
  | "family-recovery-system"
  | "denial-and-delay"
  | "enabling-vs-support"
  | "tough-love-stands"
  | "practice-conversation"
  | "intervention-preparation"
  | "post-rehab-home-plan"
  | "relapse-warning-signs";

export interface FamilyTrainingLesson {
  id: FamilyTrainingLessonId;
  englishTitle: string;
  urduTitle: string;
  englishTagline: string;
  urduTagline: string;
  durationMinutes: number;
  englishOutcome: string;
  urduOutcome: string;
  englishGoals: string[];
  urduGoals: string[];
  englishDoSay: string[];
  urduDoSay: string[];
  englishDontSay: string[];
  urduDontSay: string[];
  englishRoleplayPrompt: string;
  urduRoleplayPrompt: string;
  englishHomework: string;
  urduHomework: string;
}

export const FAMILY_TRAINING_LESSONS: FamilyTrainingLesson[] = [
  {
    id: "family-recovery-system",
    englishTitle: "Family = part of treatment",
    urduTitle: "خاندان بھی علاج کا حصہ ہے",
    englishTagline: "Move the family from panic into a calm recovery system.",
    urduTagline: "خاندان کو گھبراہٹ سے نکال کر پرسکون recovery system میں لائیں۔",
    durationMinutes: 4,
    englishOutcome:
      "Families learn what they can control, what they cannot control, and why follow-up matters.",
    urduOutcome:
      "خاندان یہ سیکھتا ہے کہ وہ کیا کنٹرول کر سکتا ہے، کیا نہیں، اور follow-up کیوں ضروری ہے۔",
    englishGoals: [
      "Explain addiction as a chronic disease, not a moral failure.",
      "Separate what the family can control from what it cannot.",
      "Reinforce that treatment and follow-up need a whole-family response.",
    ],
    urduGoals: [
      "addiction کو اخلاقی کمزوری نہیں بلکہ chronic disease سمجھائیں۔",
      "یہ واضح کریں کہ خاندان کیا کنٹرول کر سکتا ہے اور کیا نہیں۔",
      "سمجھائیں کہ علاج اور follow-up پورے خاندان کے ردعمل سے مضبوط ہوتے ہیں۔",
    ],
    englishDoSay: [
      "We cannot control every mood swing, but we can control the recovery structure at home.",
      "We will support treatment, follow-up, and calm routines.",
      "Our job is to respond steadily, not to panic every day.",
    ],
    urduDoSay: [
      "ہم ہر mood swing کو کنٹرول نہیں کر سکتے، مگر گھر کی recovery structure کو سنبھال سکتے ہیں۔",
      "ہم treatment، follow-up اور پرسکون routine کا ساتھ دیں گے۔",
      "ہمارا کام روزانہ گھبرانا نہیں بلکہ مستقل رہنا ہے۔",
    ],
    englishDontSay: [
      "You are ruining our family because you have no willpower.",
      "If you loved us, you would just stop today.",
      "We have no choice but to keep rescuing you forever.",
    ],
    urduDontSay: [
      "تم نے اپنی کمزور ارادے کی وجہ سے ہمارا خاندان برباد کیا ہے۔",
      "اگر تم ہم سے محبت کرتے تو آج ہی چھوڑ دیتے۔",
      "ہمارے پاس تمہیں ہمیشہ بچاتے رہنے کے سوا کوئی راستہ نہیں۔",
    ],
    englishRoleplayPrompt:
      "The caller says, 'Our whole house is reacting differently and we keep getting pulled into chaos.' Coach them to make a two-lane map: what the family can control today and what it cannot.",
    urduRoleplayPrompt:
      "کالر کہتا ہے: 'ہمارے گھر میں سب الگ ردعمل دے رہے ہیں اور ہم chaos میں پھنس جاتے ہیں۔' اسے two-lane map بنوانا سکھائیں: آج خاندان کیا کنٹرول کر سکتا ہے اور کیا نہیں۔",
    englishHomework:
      "Write one list called 'We will control this' and another called 'We will stop chasing this.'",
    urduHomework:
      "دو فہرستیں لکھیں: 'ہم اسے کنٹرول کریں گے' اور 'ہم اس کے پیچھے نہیں بھاگیں گے'۔",
  },
  {
    id: "denial-and-delay",
    englishTitle: "Denial and delay",
    urduTitle: "انکار اور تاخیر",
    englishTagline: "Stop arguing with denial and start moving toward a decision.",
    urduTagline: "انکار سے بحث بند کریں اور فیصلہ کن اگلے قدم کی طرف بڑھیں۔",
    durationMinutes: 4,
    englishOutcome:
      "Families learn to stop debating insight and begin planning evaluation, intervention, or follow-up.",
    urduOutcome:
      "خاندان سیکھتا ہے کہ insight پر بحث چھوڑ کر evaluation، intervention یا follow-up کی طرف کیسے بڑھنا ہے۔",
    englishGoals: [
      "Treat denial as a symptom, not as proof that nothing is wrong.",
      "Teach short responses that do not become a courtroom argument.",
      "Move from debate toward a concrete next step.",
    ],
    urduGoals: [
      "denial کو symptom سمجھیں، یہ ثبوت نہیں کہ مسئلہ نہیں ہے۔",
      "مختصر جواب سکھائیں جو بحث میں تبدیل نہ ہوں۔",
      "بحث سے ہٹ کر ایک واضح اگلے قدم کی طرف لے جائیں۔",
    ],
    englishDoSay: [
      "We hear that you do not agree, and we still need to act on what we have seen.",
      "We are not here to argue. We are here to move toward help.",
      "You do not have to feel ready for us to start the next step.",
    ],
    urduDoSay: [
      "ہم سن رہے ہیں کہ آپ متفق نہیں، لیکن جو ہم نے دیکھا ہے اس پر ہمیں عمل کرنا ہے۔",
      "ہم بحث کرنے نہیں آئے، ہم مدد کی طرف بڑھنے آئے ہیں۔",
      "اگلا قدم شروع کرنے کے لئے آپ کا ready محسوس کرنا ضروری نہیں۔",
    ],
    englishDontSay: [
      "Admit it right now or we will keep proving you wrong.",
      "You are lying again, so there is no point talking to you.",
      "We will wait until you finally understand on your own.",
    ],
    urduDontSay: [
      "ابھی فوراً مان لو ورنہ ہم تمہیں غلط ثابت کرتے رہیں گے۔",
      "تم پھر جھوٹ بول رہے ہو، تم سے بات کا کوئی فائدہ نہیں۔",
      "ہم تب تک انتظار کریں گے جب تک تم خود سمجھدار نہ بن جاؤ۔",
    ],
    englishRoleplayPrompt:
      "The AI plays a loved one saying, 'I can stop whenever I want. Everyone is overreacting.' Coach the caller to answer with calm facts and one clear next step without arguing.",
    urduRoleplayPrompt:
      "اے آئی loved one بن کر کہے: 'میں جب چاہوں چھوڑ سکتا ہوں، سب overreact کر رہے ہیں۔' کالر کو سکھائیں کہ وہ بغیر بحث کے پرسکون facts اور ایک واضح اگلا قدم بیان کرے۔",
    englishHomework:
      "Prepare one sentence that begins with 'We are not debating this tonight. The next step is...'.",
    urduHomework:
      "'ہم آج رات اس پر بحث نہیں کر رہے۔ اگلا قدم یہ ہے...' سے شروع ہونے والا ایک جملہ تیار کریں۔",
  },
  {
    id: "enabling-vs-support",
    englishTitle: "Boundaries without enabling",
    urduTitle: "حدود قائم کریں، enabling نہیں",
    englishTagline: "Replace rescue behavior with support plus structure.",
    urduTagline: "rescue behavior کو support اور structure سے بدلیں۔",
    durationMinutes: 5,
    englishOutcome:
      "Families learn to spot rescue patterns and convert them into support with consequences.",
    urduOutcome:
      "خاندان rescue patterns پہچان کر انہیں support اور consequence میں بدلنا سیکھتا ہے۔",
    englishGoals: [
      "Name recent rescue behaviors clearly and without shame.",
      "Teach the difference between support and enabling.",
      "Build one practical replacement boundary for today.",
    ],
    urduGoals: [
      "حال ہی کے rescue behaviors کو واضح اور بغیر شرمندگی کے نام دیں۔",
      "support اور enabling کا فرق سمجھائیں۔",
      "آج کے لئے ایک عملی replacement boundary بنائیں۔",
    ],
    englishDoSay: [
      "We will help you reach treatment, but we will not fund or hide the use.",
      "Support means helping recovery, not protecting the addiction from consequences.",
      "We can stay loving without removing every natural consequence.",
    ],
    urduDoSay: [
      "ہم treatment تک پہنچنے میں مدد کریں گے، مگر use کو فنڈ یا hide نہیں کریں گے۔",
      "support کا مطلب recovery میں مدد ہے، addiction کو consequences سے بچانا نہیں۔",
      "ہم محبت برقرار رکھتے ہوئے ہر consequence ختم نہیں کریں گے۔",
    ],
    englishDontSay: [
      "Fine, take the money, just promise you will not use again.",
      "We will keep covering for you because we are scared of what will happen otherwise.",
      "If we do not rescue you again tonight, it means we do not care.",
    ],
    urduDontSay: [
      "ٹھیک ہے، پیسے لے لو، بس وعدہ کرو کہ دوبارہ use نہیں کرو گے۔",
      "ہم پھر cover کریں گے کیونکہ ہمیں ڈر ہے کہ ورنہ کیا ہوگا۔",
      "اگر آج رات ہم نے rescue نہ کیا تو اس کا مطلب ہے ہم care نہیں کرتے۔",
    ],
    englishRoleplayPrompt:
      "Ask the caller for one rescue moment from the last 48 hours, then coach them to convert it into a support-plus-boundary response.",
    urduRoleplayPrompt:
      "کالر سے پچھلے 48 گھنٹوں کا ایک rescue moment پوچھیں، پھر اسے support-plus-boundary response میں بدلنے کی مشق کروائیں۔",
    englishHomework:
      "Choose one enabling behavior the family will stop for the next seven days and decide what support will replace it.",
    urduHomework:
      "ایک enabling behavior منتخب کریں جسے خاندان اگلے سات دن کے لئے بند کرے گا، اور طے کریں کہ اس کی جگہ کون سا support آئے گا۔",
  },
  {
    id: "tough-love-stands",
    englishTitle: "Tough love stands",
    urduTitle: "tough love کے اصول",
    englishTagline: "Learn calm stands and bottom lines without anger.",
    urduTagline: "غصے کے بغیر پرسکون stands اور bottom lines سیکھیں۔",
    durationMinutes: 5,
    englishOutcome:
      "Families practice one loving but firm stand they can actually follow through on.",
    urduOutcome:
      "خاندان ایک محبت بھرا مگر مضبوط stand سیکھتا ہے جس پر واقعی عمل کیا جا سکتا ہو۔",
    englishGoals: [
      "Show that tough love is calm consistency, not rage.",
      "Write one stand and one real consequence.",
      "Check whether the stand is safe to use at home today.",
    ],
    urduGoals: [
      "سمجھائیں کہ tough love غصہ نہیں بلکہ پرسکون consistency ہے۔",
      "ایک stand اور ایک حقیقی consequence لکھوائیں۔",
      "دیکھیں کہ یہ stand آج گھر میں استعمال کرنا محفوظ ہے یا نہیں۔",
    ],
    englishDoSay: [
      "We love you, we will support treatment, and we will not fund or normalize use.",
      "Our next step is treatment support, not another argument.",
      "We are choosing one clear boundary and we will keep it consistent.",
    ],
    urduDoSay: [
      "ہم آپ سے محبت کرتے ہیں، treatment کا ساتھ دیں گے، مگر use کو فنڈ یا normal نہیں کریں گے۔",
      "ہمارا اگلا قدم treatment support ہے، ایک اور بحث نہیں۔",
      "ہم ایک واضح boundary منتخب کر رہے ہیں اور اسے مستقل رکھیں گے۔",
    ],
    englishDontSay: [
      "You are dead to us if this happens again.",
      "We are saying this only to scare you into stopping.",
      "We will make up a consequence later if needed.",
    ],
    urduDontSay: [
      "اگر یہ دوبارہ ہوا تو تم ہمارے لئے مر گئے۔",
      "ہم یہ صرف تمہیں ڈرانے کے لئے کہہ رہے ہیں۔",
      "ضرورت پڑی تو بعد میں کوئی consequence بنا لیں گے۔",
    ],
    englishRoleplayPrompt:
      "Help the caller build a boundary script with four parts: care, stand, consequence, and treatment path. Confirm first that saying it at home would be safe.",
    urduRoleplayPrompt:
      "کالر کو چار حصوں پر مشتمل boundary script بنوانا سکھائیں: care، stand، consequence اور treatment path۔ پہلے یہ ضرور confirm کریں کہ اسے گھر میں کہنا محفوظ ہے۔",
    englishHomework:
      "Write one stand the whole family can repeat with the same words for the next week.",
    urduHomework:
      "ایک ایسا stand لکھیں جو پورا خاندان اگلے ہفتے ایک ہی الفاظ میں دہرا سکے۔",
  },
  {
    id: "practice-conversation",
    englishTitle: "Practice what to say",
    urduTitle: "کیا کہنا ہے، اس کی مشق",
    englishTagline: "Use facts, feelings, and one clear ask instead of lectures.",
    urduTagline: "lecture کے بجائے facts، feelings اور ایک clear ask استعمال کریں۔",
    durationMinutes: 6,
    englishOutcome:
      "Families rehearse one short conversation that lowers defensiveness and moves toward help.",
    urduOutcome:
      "خاندان ایک مختصر گفتگو کی مشق کرتا ہے جو دفاعی ردعمل کم کرے اور مدد کی طرف لے جائے۔",
    englishGoals: [
      "Teach a short structure for difficult conversations.",
      "Reduce blaming, lecturing, and circular arguments.",
      "Give the family one specific ask they can deliver today.",
    ],
    urduGoals: [
      "مشکل گفتگو کے لئے ایک مختصر structure سکھائیں۔",
      "الزام، lecture اور چکر دار بحث کم کریں۔",
      "آج کے لئے ایک specific ask تیار کروائیں۔",
    ],
    englishDoSay: [
      "In the last week I saw you miss follow-up and stay out all night, and I feel scared.",
      "I want us to take one next step today: speak to Willing Ways or plan an intervention.",
      "I am going to stay calm and keep this conversation short.",
    ],
    urduDoSay: [
      "پچھلے ہفتے میں نے دیکھا کہ آپ نے follow-up چھوڑا اور ساری رات باہر رہے، اور مجھے ڈر لگا۔",
      "میں چاہتا ہوں کہ آج ہم ایک اگلا قدم لیں: Willing Ways سے بات کریں یا intervention plan کریں۔",
      "میں پرسکون رہوں گا اور یہ گفتگو مختصر رکھوں گا۔",
    ],
    englishDontSay: [
      "You always do this and nobody can trust you.",
      "Let me list every mistake you made this year.",
      "We are going to keep talking until you finally agree.",
    ],
    urduDontSay: [
      "تم ہمیشہ یہی کرتے ہو اور تم پر کبھی بھروسہ نہیں کیا جا سکتا۔",
      "آؤ میں اس سال کی تمہاری ساری غلطیاں گنواؤں۔",
      "ہم تب تک بولتے رہیں گے جب تک تم مان نہ لو۔",
    ],
    englishRoleplayPrompt:
      "Run a roleplay where the AI plays the loved one in denial and the caller practices two facts, one feeling, and one clear ask.",
    urduRoleplayPrompt:
      "roleplay کروائیں جس میں اے آئی denial والے loved one کا کردار ادا کرے اور caller دو facts، ایک feeling اور ایک clear ask کی مشق کرے۔",
    englishHomework:
      "Write your next conversation in three lines only: two facts, one feeling, one ask.",
    urduHomework:
      "اپنی اگلی گفتگو صرف تین لائنوں میں لکھیں: دو facts، ایک feeling، ایک ask۔",
  },
  {
    id: "intervention-preparation",
    englishTitle: "Intervention preparation",
    urduTitle: "intervention کی تیاری",
    englishTagline: "Prepare the family before approaching a resistant loved one.",
    urduTagline: "مزاحمت کرنے والے loved one سے بات سے پہلے خاندان کو تیار کریں۔",
    durationMinutes: 5,
    englishOutcome:
      "Families learn how to get aligned, reduce mixed messages, and prepare for a structured intervention.",
    urduOutcome:
      "خاندان alignment، mixed messages کم کرنے اور structured intervention کی تیاری سیکھتا ہے۔",
    englishGoals: [
      "Choose one lead family contact and one clear treatment ask.",
      "Gather recent safety facts and failed rescue patterns.",
      "Prepare for denial without splitting the family system.",
    ],
    urduGoals: [
      "ایک lead family contact اور ایک clear treatment ask منتخب کریں۔",
      "حالیہ safety facts اور rescue patterns جمع کریں۔",
      "denial کے لئے تیار رہیں مگر family system کو split نہ ہونے دیں۔",
    ],
    englishDoSay: [
      "We are going into this conversation as one calm family system.",
      "We are ready to support treatment immediately if you agree.",
      "We have one spokesperson and one next step.",
    ],
    urduDoSay: [
      "ہم اس گفتگو میں ایک پرسکون family system کے طور پر داخل ہوں گے۔",
      "اگر آپ agree کریں تو ہم فوری treatment support کے لئے تیار ہیں۔",
      "ہمارے پاس ایک spokesperson اور ایک اگلا قدم ہے۔",
    ],
    englishDontSay: [
      "Everybody should say whatever they feel in the moment.",
      "One person can rescue while another sets limits and it will balance out.",
      "We do not need a plan; we will improvise when emotions rise.",
    ],
    urduDontSay: [
      "ہر شخص اس وقت جو دل میں آئے کہہ دے۔",
      "ایک شخص rescue کرے اور دوسرا limit لگائے، سب ٹھیک ہو جائے گا۔",
      "ہمیں plan کی ضرورت نہیں، جذبات بڑھیں گے تو خود دیکھ لیں گے۔",
    ],
    englishRoleplayPrompt:
      "Coach the caller through a pre-intervention checklist: spokesperson, safety risks, last 30 days of evidence, treatment request, and backup plan.",
    urduRoleplayPrompt:
      "caller کو pre-intervention checklist کی مشق کروائیں: spokesperson، safety risks، پچھلے 30 دن کے facts، treatment request اور backup plan۔",
    englishHomework:
      "Agree on one spokesperson, one backup helper, and one sentence everyone will support.",
    urduHomework:
      "ایک spokesperson، ایک backup helper اور ایک جملہ طے کریں جس پر پورا خاندان متفق ہو۔",
  },
  {
    id: "post-rehab-home-plan",
    englishTitle: "After discharge home plan",
    urduTitle: "discharge کے بعد گھر کا منصوبہ",
    englishTagline: "Build a low-chaos home structure for the early return period.",
    urduTagline: "واپسی کے ابتدائی دنوں کے لئے کم-chaos والا گھریلو structure بنائیں۔",
    durationMinutes: 5,
    englishOutcome:
      "Families leave with a simple daily home plan for follow-up, routines, and reduced trigger access.",
    urduOutcome:
      "خاندان follow-up، routines اور triggers کی کم رسائی کے لئے ایک سادہ home plan لے کر جاتا ہے۔",
    englishGoals: [
      "Teach why chaos raises relapse risk after discharge.",
      "Anchor the day around sleep, meals, follow-up, and safe structure.",
      "Reduce access to the most obvious triggers without policing every minute.",
    ],
    urduGoals: [
      "سمجھائیں کہ discharge کے بعد chaos relapse risk کیوں بڑھاتا ہے۔",
      "دن کو sleep، meals، follow-up اور safe structure کے گرد منظم کریں۔",
      "ہر منٹ policing کے بغیر obvious triggers کی رسائی کم کریں۔",
    ],
    englishDoSay: [
      "We are creating a calm routine, not a punishment routine.",
      "The first weeks at home need structure, not overconfidence.",
      "We will review the next 24 hours together, not the whole future.",
    ],
    urduDoSay: [
      "ہم punishment routine نہیں بلکہ calm routine بنا رہے ہیں۔",
      "گھر کے ابتدائی ہفتوں میں overconfidence نہیں، structure چاہیے۔",
      "ہم پورا مستقبل نہیں، اگلے 24 گھنٹے اکٹھے دیکھیں گے۔",
    ],
    englishDontSay: [
      "You are home now, so treatment is over and everything should be normal.",
      "We need to watch you every second or nothing will work.",
      "If you look fine, follow-up is probably not needed anymore.",
    ],
    urduDontSay: [
      "اب تم گھر آگئے ہو، علاج ختم ہوا اور سب فوراً normal ہونا چاہیے۔",
      "ہمیں ہر سیکنڈ تمہیں دیکھنا ہوگا، ورنہ کچھ کام نہیں کرے گا۔",
      "اگر تم ٹھیک لگ رہے ہو تو follow-up شاید اب ضروری نہیں۔",
    ],
    englishRoleplayPrompt:
      "Help the caller build a 10-line home plan covering sleep, meals, movement, follow-up, phone rules, money access, risky contacts, family check-in, and what to do if warning signs rise.",
    urduRoleplayPrompt:
      "caller کو 10-line home plan بنوانا سکھائیں جس میں sleep، meals، movement، follow-up، phone rules، money access، risky contacts، family check-in اور warning signs بڑھنے پر اگلا قدم شامل ہو۔",
    englishHomework:
      "Write tomorrow's home plan on one page and review it with the family before night.",
    urduHomework:
      "کل کا home plan ایک صفحے پر لکھیں اور رات سے پہلے خاندان کے ساتھ دیکھیں۔",
  },
  {
    id: "relapse-warning-signs",
    englishTitle: "Relapse warning signs",
    urduTitle: "relapse warning signs",
    englishTagline: "Catch the relapse process early instead of reacting late.",
    urduTagline: "دیر سے react کرنے کے بجائے relapse process کو جلدی پکڑیں۔",
    durationMinutes: 4,
    englishOutcome:
      "Families learn a simple scan for secrecy, isolation, anger spikes, euphoric recall, and dropped follow-up.",
    urduOutcome:
      "خاندان secrecy، isolation، anger spikes، euphoric recall اور dropped follow-up کے لئے ایک سادہ scan سیکھتا ہے۔",
    englishGoals: [
      "Normalize relapse as a process with warning signs.",
      "Teach the family to scan the last week instead of reacting to one dramatic moment.",
      "Convert warning signs into one same-day action.",
    ],
    urduGoals: [
      "relapse کو warning signs والے process کے طور پر سمجھائیں۔",
      "خاندان کو ایک ڈرامائی لمحے کے بجائے پورے ہفتے کا scan سکھائیں۔",
      "warning signs کو اسی دن کے ایک action میں بدلیں۔",
    ],
    englishDoSay: [
      "We are noticing warning signs early so we can act early.",
      "This is not proof that recovery is over, but it is a signal to tighten support.",
      "Today we will name three signs, two triggers, and one action.",
    ],
    urduDoSay: [
      "ہم warning signs جلدی notice کر رہے ہیں تاکہ جلدی عمل کر سکیں۔",
      "یہ recovery کے ختم ہونے کا ثبوت نہیں، مگر support مضبوط کرنے کا signal ہے۔",
      "آج ہم تین signs، دو triggers اور ایک action طے کریں گے۔",
    ],
    englishDontSay: [
      "Nothing happened yet, so we should just wait and see.",
      "One warning sign means the whole treatment failed.",
      "Let us ignore secrecy because confronting it may upset the peace.",
    ],
    urduDontSay: [
      "ابھی کچھ نہیں ہوا، اس لئے بس wait and see کرتے ہیں۔",
      "ایک warning sign کا مطلب پورا treatment fail ہو گیا۔",
      "secrecy کو ignore کرتے ہیں کیونکہ بات کرنے سے ماحول خراب ہو جائے گا۔",
    ],
    englishRoleplayPrompt:
      "Guide the caller through a 3-2-1 scan: three warning signs seen this week, two triggers, and one action for today.",
    urduRoleplayPrompt:
      "caller کو 3-2-1 scan کروائیں: اس ہفتے کے تین warning signs، دو triggers اور آج کے لئے ایک action۔",
    englishHomework:
      "Keep a one-week warning-signs list and decide who in the family will act on it early.",
    urduHomework:
      "ایک ہفتے کی warning-signs list بنائیں اور طے کریں کہ خاندان میں کون اس پر جلدی action لے گا۔",
  },
];

export const FAMILY_TRAINING_HOME_LESSON_IDS: FamilyTrainingLessonId[] = [
  "practice-conversation",
  "enabling-vs-support",
  "post-rehab-home-plan",
  "intervention-preparation",
];

export function normalizeFamilyTrainingLessonId(
  value: string | null | undefined,
): FamilyTrainingLessonId | null {
  if (
    value &&
    FAMILY_TRAINING_LESSONS.some((trainingLesson) => trainingLesson.id === value)
  ) {
    return value as FamilyTrainingLessonId;
  }

  return null;
}

export function getFamilyTrainingLesson(
  lessonId: FamilyTrainingLessonId | null | undefined,
) {
  if (!lessonId) {
    return null;
  }

  return (
    FAMILY_TRAINING_LESSONS.find(
      (trainingLesson) => trainingLesson.id === lessonId,
    ) ?? null
  );
}

export function buildFamilyTrainingLessonPrompt(
  lessonId: FamilyTrainingLessonId | null | undefined,
) {
  const trainingLesson = getFamilyTrainingLesson(lessonId);

  if (!trainingLesson) {
    return "";
  }

  return `Selected family coaching module: ${trainingLesson.englishTitle}. ${trainingLesson.englishTagline} Target duration: about ${trainingLesson.durationMinutes} minutes if the caller wants the full practice. Teaching goals: ${trainingLesson.englishGoals.join(" ")} Preferred language to model: ${trainingLesson.englishDoSay.join(" ")} Language to avoid or reframe: ${trainingLesson.englishDontSay.join(" ")} If the caller agrees, use this roleplay prompt: ${trainingLesson.englishRoleplayPrompt} End with this homework: ${trainingLesson.englishHomework} Because this module was selected before the call, after greeting and confirming safety, move directly into this module unless the caller says a more urgent problem needs priority.`;
}
