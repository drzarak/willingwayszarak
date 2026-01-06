# Copilot Instructions for drzarakmind

## Project Overview
**Mind by Dr. Zarak** – A Next.js mental health & ADHD support web app using OpenAI Realtime API for voice/text chat.

## Owner / Contact
- **Owner:** Dr. Zarak (drzarak)
- **Email:** care@drzarak.com
- **WhatsApp:** https://wa.me/+923357900295

## Repository
- **GitHub:** https://github.com/drzarak/drzarakmind
- **Default branch:** main
- **Framework:** Next.js 15 + React 19 + Tailwind CSS

## Deployment (Vercel)
The project auto-deploys to Vercel when pushed to `main`.

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
| `SUPABASE_URL` | Supabase project URL (if using Supabase) |
| `SUPABASE_ANON_KEY` | Supabase publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secret/service-role key |

## Build & Lint Commands
```bash
npm install
npm run lint
npm run build
npm run dev   # local development
```

## Key Files
- `app/App.tsx` – Main UI orchestration (voice/text chat, summary panel, voice selector)
- `app/agentConfigs/mentalHealthCoach.ts` – Dr. Zarak agent prompt/instructions
- `app/components/` – UI components (Transcript, BottomToolbar, CrisisBanner, etc.)
- `app/api/session/route.ts` – Creates OpenAI Realtime session
- `app/api/responses/route.ts` – Chat Completions for summary generation
- `app/globals.css` – Dark-mode-only styling

## Features
1. **Dark-mode only UI** – Reduces eye strain
2. **Voice chat** – OpenAI Realtime API with VAD
3. **Text chat** – Send messages via text input
4. **Voice selector** – Choose from OpenAI voices (sage, alloy, coral, verse, ash, shimmer)
5. **Live summary panel** – Running summary + remedies updated after each assistant turn
6. **Download summary** – Export summary as .txt file
7. **Conversation practice** – Helps users rehearse difficult conversations
8. **Human consultation prompt** – AI provides Dr. Zarak contact info when user requests human help

## AI Agent Behavior
- Agent is "Dr. Zarak" – warm, empathetic ADHD/mental health coach
- Provides quick tips, fun facts, and evidence-based strategies
- Detects crisis keywords and provides emergency resources
- Offers human consultation contact when explicitly requested

## Workflow Reminders
1. Always run `npm run lint` and `npm run build` before pushing
2. Push to `main` triggers Vercel production deployment
3. Check Vercel dashboard for deployment status
4. Environment variables must be set in Vercel (not in code)
