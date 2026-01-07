# Dr. Zarak AI-Assisted Family Health Hub - UI Guide

## Main Interface Overview

### 1. Header Navigation
```
┌─────────────────────────────────────────────────────────────────┐
│  [DZ] Dr. Zarak AI-Assisted Family Health Hub                   │
│       Clear, calm ADHD & mental health support                   │
│                                        [Language 🌐] [●Realtime] │
├─────────────────────────────────────────────────────────────────┤
│  [Health Dashboard] [Telehealth Consultation]                    │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Logo with Dr. Zarak branding
- Updated title reflecting family health focus
- Language selector dropdown (EN/UR/AR)
- Status indicator (OpenAI Realtime)
- Tab navigation for Dashboard and Telehealth

### 2. Language Selector
```
┌──────────────────┐
│ 🇬🇧 English   ✓  │
│ 🇵🇰 اردو         │
│ 🇸🇦 العربية       │
└──────────────────┘
```

**Features:**
- Flag icons for visual identification
- Native language names
- Check mark for current selection
- Smooth dropdown animation
- Persistent preference storage

### 3. Health Dashboard
```
┌─────────────────────────────────────────────────────────────────┐
│  Health Dashboard                                                │
│  Predictive Analytics                                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┬─────────────────────────┐          │
│  │ Diabetes Risk      [Low]│ Heart Disease    [Med] │          │
│  │ 25 / 100                │ 35 / 100               │          │
│  │ ████░░░░░░░░░░░░        │ ███████░░░░░░░         │          │
│  └─────────────────────────┴─────────────────────────┘          │
│  ┌─────────────────────────┬─────────────────────────┐          │
│  │ Hypertension      [Med] │ Mental Health   [Med]  │          │
│  │ 40 / 100                │ 45 / 100               │          │
│  │ ████████░░░░░░░         │ █████████░░░░░         │          │
│  └─────────────────────────┴─────────────────────────┘          │
│                                                                  │
│  ⓘ Risk Assessment Information                                  │
│  These risk scores are calculated based on various health       │
│  metrics, lifestyle factors, and medical history.               │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Four risk categories with visual indicators
- Color-coded badges (green/yellow/red)
- Progress bars showing risk level
- Numerical scores (0-100)
- Informational disclaimer
- Responsive grid layout

### 4. Telehealth Consultation Panel
```
┌─────────────────────────────────────────────────────────────────┐
│  Telehealth Consultation                                    [×] │
│  Schedule a private consultation with Dr. Zarak                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────┬──────────────────────────┐        │
│  │ Consult Dr. Zarak        │ My Appointments          │        │
│  │ Contact directly for     │ Schedule and manage      │        │
│  │ personalized care        │ your appointments        │        │
│  │                          │                          │        │
│  │ [✉] Email:               │ [Book Appointment]       │        │
│  │     care@drzarak.com     │                          │        │
│  │                          │ Coming soon: View and    │        │
│  │ [📱] WhatsApp:           │ manage your scheduled    │        │
│  │     +92 335 7900295      │ appointments here        │        │
│  └──────────────────────────┴──────────────────────────┘        │
│                                                                  │
│  Appointment Booking Form (when expanded)                       │
│  ┌────────────────────────────────────────────────┐            │
│  │ Preferred Date: [___________]                  │            │
│  │ Preferred Time: [___________]                  │            │
│  │ Reason for Visit:                              │            │
│  │ [_________________________________________]     │            │
│  │ [_________________________________________]     │            │
│  │                                                 │            │
│  │ [Submit Request]          [Cancel]             │            │
│  └────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Direct contact information prominently displayed
- Clickable email and WhatsApp links
- Appointment booking form with validation
- Date and time selection
- Reason for visit text area
- Professional healthcare design

### 5. Crisis Banner (Existing, Enhanced)
```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠ Need immediate help?                                    [×] │
│  If you're in crisis, please reach out to emergency services   │
│  or a crisis helpline.                                         │
│  📞 988 or 1-800-273-8255   💬 Text HOME to 741741           │
└─────────────────────────────────────────────────────────────────┘
```

### 6. Mood Selector (Existing)
```
┌─────────────────────────────────────────────────────────────────┐
│  How are you feeling?                                           │
│  [😊 Happy] [😌 Calm] [😰 Anxious] [😢 Sad] [😠 Angry]        │
│  Intensity: ●●●●●○○○○○ (5/10)                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7. Main Chat Interface (Existing, Enhanced)
```
┌─────────────────────────────────────────────────┬───────────────┐
│  Conversation Transcript                        │ Live summary  │
│  ┌────────────────────────────────────────────┐│ [Download]    │
│  │ User: Hello                                 ││               │
│  │ Dr. Zarak: Hello! How can I help you       ││ As you chat,  │
│  │           today?                            ││ a brief       │
│  │ User: I'm feeling anxious                   ││ summary will  │
│  │ Dr. Zarak: I hear you. Let's talk about    ││ appear here.  │
│  │           what's causing this anxiety...    ││               │
│  │                                              ││ Immediate     │
│  │ [Recording... 🔴]                           ││ remedies      │
│  └────────────────────────────────────────────┘│ • None yet    │
│                                                  │               │
└─────────────────────────────────────────────────┴───────────────┘
```

### 8. Bottom Toolbar (Existing, Enhanced)
```
┌─────────────────────────────────────────────────────────────────┐
│  [🎤 Connect] Voice: [Sage ▾] [VAD On] [Recording On]          │
│  Text: [Type your message...                      ] [Send]      │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Voice connection toggle
- Voice selection dropdown (8 voices)
- VAD (Voice Activity Detection) toggle
- Recording indicator
- Text chat input with send button

## Multilingual Examples

### English
```
Title: Dr. Zarak AI-Assisted Family Health Hub
Subtitle: Clear, calm ADHD & mental health support
Button: Book Appointment
```

### Urdu (اردو)
```
Title: ڈاکٹر زارک AI سے معاون خاندانی صحت مرکز
Subtitle: واضح، پرسکون ADHD اور ذہنی صحت کی مدد
Button: ملاقات بک کریں
```

### Arabic (العربية)
```
Title: مركز د. زارق الصحي العائلي بمساعدة الذكاء الاصطناعي
Subtitle: دعم واضح وهادئ للاضطراب وفرط الحركة والصحة العقلية
Button: حجز موعد
```

## Responsive Design

### Mobile View (< 768px)
- Single column layout
- Stacked dashboard cards
- Collapsible sections
- Touch-optimized buttons
- Simplified navigation

### Tablet View (768px - 1024px)
- Two-column layout for dashboard
- Side-by-side sections
- Optimized spacing

### Desktop View (> 1024px)
- Full three-column layout
- Maximum width container (1536px)
- Enhanced visual hierarchy
- Additional information visible

## Color Scheme

### Primary Colors
- Background: `#020617` (slate-950)
- Surface: `#0f172a` (slate-900)
- Border: `#1e293b` (slate-800)
- Text Primary: `#f1f5f9` (slate-100)
- Text Secondary: `#94a3b8` (slate-400)

### Risk Level Colors
- Low Risk: `#22c55e` (green-500)
- Medium Risk: `#eab308` (yellow-500)
- High Risk: `#ef4444` (red-500)

### Accent Colors
- Primary: `#3b82f6` (blue-600)
- Success: `#10b981` (green-500)
- Warning: `#f59e0b` (amber-500)
- Error: `#ef4444` (red-500)

## Accessibility Features

### Keyboard Navigation
- Tab through all interactive elements
- Enter to activate buttons
- Escape to close modals/dropdowns
- Arrow keys for selection lists

### Screen Reader Support
- ARIA labels on all controls
- Semantic HTML structure
- Role attributes for custom components
- Alt text for icons and images

### Visual Accessibility
- High contrast dark theme
- Focus indicators on interactive elements
- Minimum 4.5:1 contrast ratio
- Scalable text (rem units)

## Animation & Transitions

### Micro-interactions
- Button hover states (150ms)
- Dropdown expand/collapse (200ms)
- Modal fade in/out (300ms)
- Progress bar fill (500ms)

### Page Transitions
- Smooth scrolling
- Tab switching animation
- Language change transition
- Loading states

## Technical Implementation Notes

### Component Structure
```
App.tsx (Container)
├── Header
│   ├── Logo & Branding
│   ├── LanguageSelector
│   └── Navigation Tabs
├── TelehealthPanel (Conditional)
├── HealthDashboard (Conditional)
├── CrisisBanner (Dismissible)
├── MoodSelector
├── Main Content
│   ├── Transcript
│   └── Summary Panel
├── Tips Section
├── Conversation Practice
└── BottomToolbar
```

### State Management
- React hooks (useState, useEffect, useRef)
- LocalStorage for preferences
- i18n context for translations
- Supabase client for data

### Data Flow
1. User interacts with UI
2. State updates trigger re-renders
3. API calls to OpenAI/Supabase
4. Response updates local state
5. UI reflects new data

## Performance Optimizations

### Code Splitting
- Dynamic imports for heavy components
- Lazy loading for modal content
- Route-based splitting

### Bundle Optimization
- Tree shaking unused code
- Minification in production
- Compression (gzip/brotli)

### Caching Strategy
- Static assets cached
- API responses cached when appropriate
- LocalStorage for user preferences

## Security Considerations

### Data Protection
- HTTPS only
- Environment variables for secrets
- Row-Level Security in database
- Input sanitization

### Authentication Flow
1. User signs in via Supabase Auth
2. Session token stored securely
3. RLS policies enforce access control
4. Automatic token refresh

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Supabase schema deployed
- [ ] DNS configured
- [ ] SSL certificate active
- [ ] Error monitoring setup
- [ ] Analytics configured
- [ ] Backup strategy in place
- [ ] Compliance review completed

---

This UI guide provides a comprehensive overview of all interface elements, their functionality, and implementation details for the Dr. Zarak AI-Assisted Family Health Hub.
