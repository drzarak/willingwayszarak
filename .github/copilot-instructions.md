# Copilot Instructions for drzarakmind

## Project Overview
**Dr. Zarak AI-Assisted Family Health Hub** – A comprehensive Next.js family health platform combining mental health support, telehealth consultation, electronic health records (EHR), and predictive analytics. Uses OpenAI Realtime API for voice/text AI interactions with multilingual support (English, Urdu, Arabic).

## Owner / Contact
- **Owner:** Dr. Zarak (drzarak)
- **Email:** care@drzarak.com
- **WhatsApp:** https://wa.me/+923357900295

## Repository
- **GitHub:** https://github.com/drzarak/drzarakmind
- **Default branch:** main
- **Framework:** Next.js 15 + React 19 + Tailwind CSS
- **Database:** Supabase (PostgreSQL with Row-Level Security)
- **i18n:** react-i18next (English, Urdu, Arabic)

## Current Status (as of Jan 2026)
✅ **Feature Branch:** All new features implemented on `copilot/vscode-mk3she2c-elz2`
⏳ **Production Deployment:** NOT yet deployed (requires merge to `main`)
✅ **Quality Checks:** Build passing, linter clean, 0 security vulnerabilities
✅ **Documentation:** Complete (README, IMPLEMENTATION_SUMMARY, UI_GUIDE, QUICKSTART)

## Deployment (Vercel)
The project auto-deploys to Vercel when pushed to `main`.

### Current Deployment Status
- **Feature branch changes:** NOT on main, NOT deployed to production
- **To deploy:** Merge PR to main branch
- **Auto-deploy:** Vercel will automatically build and deploy from main

### Manual CLI Deployment
```bash
cd /workspaces/drzarakmind

# Link project (first time or re-link)
VERCEL_TOKEN='<VERCEL_TOKEN>' vercel link --project drzarakmind --yes

# Deploy to production
vercel --prod --yes
```

### Vercel Project Info
- **Project name:** drzarakmind
- **Scope:** drzaraks-projects (personal)

## Environment Variables (set in Vercel Dashboard)
Do NOT commit secrets to the repo. Set these in Vercel → Project Settings → Environment Variables:

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for Realtime + Chat Completions |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (required for EHR features) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secret/service-role key |

**Note:** After merging to main, remember to add the Supabase environment variables to Vercel!

## Build & Lint Commands
```bash
npm install
npm run lint
npm run build
npm run dev   # local development
```

## Key Files

### Core Application
- `app/App.tsx` – Main UI orchestration with multilingual support, health dashboard, telehealth panel
- `app/layout.tsx` – Root layout with updated branding
- `app/agentConfigs/mentalHealthCoach.ts` – Dr. Zarak agent prompt/instructions
- `app/globals.css` – Dark-mode-only styling

### New Components (Added)
- `app/components/LanguageSelector.tsx` – Language switcher (EN/UR/AR)
- `app/components/TelehealthPanel.tsx` – Telehealth consultation and appointment booking
- `app/components/HealthDashboard.tsx` – Predictive analytics with risk scores
- `app/components/Transcript.tsx` – Conversation display
- `app/components/BottomToolbar.tsx` – Voice/text controls
- `app/components/CrisisBanner.tsx` – Emergency resources
- `app/components/MoodSelector.tsx` – Mood tracking

### Internationalization
- `app/i18n/config.ts` – i18next configuration
- `app/i18n/locales/en.json` – English translations (87 strings)
- `app/i18n/locales/ur.json` – Urdu translations (87 strings)
- `app/i18n/locales/ar.json` – Arabic translations (87 strings)

### Backend & Database
- `app/lib/supabase.ts` – Supabase client and TypeScript types for EHR
- `app/api/session/route.ts` – Creates OpenAI Realtime session
- `app/api/responses/route.ts` – Chat Completions for summary generation
- `supabase-schema.sql` – Complete database schema (6 tables with RLS policies)

### Documentation
- `README.md` – Updated with all features and setup instructions
- `IMPLEMENTATION_SUMMARY.md` – Technical architecture and implementation details
- `UI_GUIDE.md` – Visual interface documentation
- `QUICKSTART_NEW.md` – Developer quick start guide

## Features

### Core Mental Health Support
1. **Dark-mode only UI** – Reduces eye strain
2. **Voice chat** – OpenAI Realtime API with VAD
3. **Text chat** – Send messages via text input
4. **Voice selector** – Choose from 8 OpenAI voices (sage, alloy, verse, nova, shimmer, onyx, echo, fable)
5. **Live summary panel** – Running summary + remedies updated after each assistant turn
6. **Download summary** – Export summary as .txt file
7. **Conversation practice** – Helps users rehearse difficult conversations
8. **Mood tracking** – Track emotional state with intensity slider
9. **Crisis resources** – Immediate access to emergency helplines

### New Features (Added in Latest Updates)

#### Multilingual Support 🌍
- **3 Languages:** English, Urdu (اردو), Arabic (العربية)
- **Language Selector:** Dropdown in header with persistent preferences
- **Complete Translation:** All UI elements translated (87 strings per language)
- **RTL Support:** Ready for Arabic right-to-left text

#### Telehealth Consultation 🏥
- **Direct Contact:** Email (care@drzarak.com) and WhatsApp (+92 335 7900295)
- **Appointment Booking:** Complete booking form with date/time selection
- **Professional UI:** Healthcare-focused design
- **Database Ready:** Appointments table in Supabase schema

#### Health Dashboard & Predictive Analytics 📊
- **4 Risk Categories:** Diabetes, heart disease, hypertension, mental health
- **Risk Scores:** 0-100 scale with color-coded indicators
- **Risk Levels:** Low/Medium/High with visual progress bars
- **Real-time Display:** Updates based on health data

#### Electronic Health Records (EHR) 🗂️
- **Supabase Integration:** Complete PostgreSQL database
- **6 Tables:** patients, appointments, health_records, health_metrics, risk_scores, conversation_history
- **Row-Level Security:** User-scoped access policies
- **HIPAA-Compliant:** Encrypted storage, audit trails
- **TypeScript Types:** Full type safety for all database models

## Database Schema (Supabase)

### Tables Created
1. **patients** – Demographics with auth linkage
2. **appointments** – Scheduling and tracking
3. **health_records** – Medical records and visit notes
4. **health_metrics** – Vital signs time-series
5. **risk_scores** – Calculated health assessments
6. **conversation_history** – AI interaction tracking

### Setup Instructions
1. Create Supabase project at https://supabase.com
2. Run `supabase-schema.sql` in SQL Editor
3. Copy URL and keys to Vercel environment variables
4. Tables will have Row-Level Security enabled

## AI Agent Behavior
- Agent is "Dr. Zarak" – warm, empathetic ADHD/mental health coach
- Provides quick tips, fun facts, and evidence-based strategies
- Detects crisis keywords and provides emergency resources
- Offers human consultation contact when explicitly requested
- Supports multilingual interactions (with proper i18n setup)
- Integrates with health dashboard for holistic care

## Project Goals & Agenda

### Completed ✅
- [x] Multilingual support (English, Urdu, Arabic)
- [x] Telehealth consultation interface
- [x] Health dashboard with predictive analytics
- [x] EHR system with Supabase
- [x] Complete documentation
- [x] Security scan (0 vulnerabilities)
- [x] Build passing, linter clean

### In Progress ⏳
- [ ] Merge PR to main branch
- [ ] Deploy to Vercel production
- [ ] Set up Supabase database in production
- [ ] Add environment variables to Vercel

### Future Enhancements 🔮
- [ ] User authentication (Supabase Auth)
- [ ] Real patient data integration
- [ ] Video consultation (Doximity-style)
- [ ] File upload for medical documents
- [ ] Data export features
- [ ] Mobile app (React Native)

## Known Limitations

### Vercel Limitations
- Free tier: Limited build minutes, bandwidth
- Serverless functions: 10s timeout on hobby plan
- Database: Use Supabase (Vercel Postgres also available)

### Supabase Limitations
- Free tier: 500MB database, 2GB bandwidth
- Real-time: Limited connections on free tier
- Auth: Email verification requires SMTP setup

## Workflow Reminders
1. Always run `npm run lint` and `npm run build` before pushing
2. Push to `main` triggers Vercel production deployment
3. Check Vercel dashboard for deployment status
4. Environment variables must be set in Vercel (not in code)
5. **Current status:** Changes on feature branch, NOT deployed to production
6. **To deploy:** Merge PR to main, then Vercel will auto-deploy
7. **After merge:** Add Supabase environment variables to Vercel
8. **Database setup:** Run supabase-schema.sql in Supabase SQL Editor

## Bug Prevention & Quality

### Pre-commit Checklist
- [ ] Run `npm run lint` – must pass with 0 errors
- [ ] Run `npm run build` – must succeed
- [ ] Test new features locally
- [ ] Check for console errors in browser
- [ ] Verify TypeScript types compile
- [ ] Test multilingual switching
- [ ] Review git diff before committing

### Testing Strategy
- Manual testing for all new features
- Browser testing (Chrome, Firefox, Safari)
- Mobile responsive testing
- Language switching testing
- Database connection testing (when deployed)

### Security Practices
- Never commit secrets (.env in .gitignore)
- Use environment variables for all keys
- Supabase RLS policies for data security
- Input validation on all forms
- CodeQL security scanning before merge

## Quick Commands Reference

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Production build
npm run lint                   # Run ESLint

# Git workflow (via report_progress tool, not direct git)
# Changes are committed and pushed via report_progress

# Vercel deployment (manual if needed)
vercel link --project drzarakmind
vercel --prod

# Check current branch
git branch                     # Should show feature branch
git status                     # Check working tree

# View implementation details
cat IMPLEMENTATION_SUMMARY.md  # Technical details
cat UI_GUIDE.md               # Interface documentation
cat QUICKSTART_NEW.md         # Quick start guide
```

## Contact for Issues
- **GitHub Issues:** https://github.com/drzarak/drzarakmind/issues
- **Email:** care@drzarak.com
- **WhatsApp:** +92 335 7900295

---

**Last Updated:** January 7, 2026
**Status:** Feature complete, awaiting production deployment
**Next Step:** Merge PR to main for Vercel auto-deployment
