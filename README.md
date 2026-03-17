# ResumeAI

An AI-powered resume optimizer that rewrites your resume bullets for specific job descriptions, scores your ATS match, generates a cover letter, and prepares you for interviews.

Live at: https://tryresumeai.vercel.app

---

## What it does

- Rewrites resume bullets using exact terminology from the job description
- Scores ATS match before and after optimization (0-100)
- Generates a tailored cover letter in first person
- Identifies missing keywords, weak bullets, and skill gaps
- Provides likely interview questions based on your resume and the JD
- Downloads optimized resume as PDF and cover letter as DOCX
- Saves all past optimizations to your account with full history
- Regenerates with different focus modes (max ATS, senior tone, shorter bullets, custom instruction)

---

## Tech stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Auth**: Clerk (Google + GitHub OAuth)
- **Database**: Supabase (PostgreSQL)
- **Rate limiting**: Upstash Redis
- **AI**: Multi-provider fallback chain — Gemini 2.5 Flash, Cerebras Qwen 235B, Groq Llama 3.3 70B, Mistral Small
- **PDF parsing**: pdfjs-dist with position-aware coordinate extraction
- **PDF generation**: jsPDF
- **DOCX generation**: docx + file-saver
- **Deployment**: Vercel

---

## AI fallback chain

The app tries 29 AI providers in sequence, automatically falling through to the next when a provider hits its quota:
**Updated chain structure — 29 total providers:**
```
Gemini 2.5 Flash      × 4 keys  =  4 providers  (best quality, thinking model)
Gemini Flash Latest   × 4 keys  =  4 providers
Gemini 3 Flash        × 4 keys  =  4 providers
Gemini 3.1 Flash Lite × 4 keys  =  4 providers
Gemini 2.5 Flash Lite × 4 keys  =  4 providers
Gemini Flash Lite     × 4 keys  =  4 providers
                                  ──────────────
Total Gemini                      24 providers
Cerebras Qwen 235B                 1 provider
Groq Llama 3.3 70B                 1 provider
Groq Llama 3.1 70B                 1 provider
Groq Mixtral 8x7B                  1 provider
Mistral Small                      1 provider
                                  ──────────────
Grand total                       29 providers

## Running locally

### Prerequisites

- Node.js 18+
- A Clerk account (free)
- A Supabase project (free)
- An Upstash Redis database (free)
- At least one AI API key (Gemini, Groq, or Cerebras — all free)

### Setup

1. Clone the repo
```bash
git clone https://github.com/NeoMatrixAdmin/resumeai.git
cd resumeai
```

2. Install dependencies
```bash
npm install
```

3. Create `.env.local` in the root directory
```env
# Gemini (get free keys at aistudio.google.com)
GEMINI_API_KEY=
GEMINI_API_KEY_2=

# Groq (get free key at console.groq.com)
GROQ_API_KEY=

# Cerebras (get free key at cloud.cerebras.ai)
CEREBRAS_API_KEY=

# Mistral (get free key at console.mistral.ai)
MISTRAL_API_KEY=

# Clerk (get keys at clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Supabase (get keys at supabase.com)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Upstash Redis (get keys at upstash.com)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Admin bypass (your Clerk user ID for unlimited access)
ADMIN_USER_ID=
NEXT_PUBLIC_ADMIN_USER_ID=
```

4. Set up Supabase database

Run this in your Supabase SQL editor:
```sql
create table public.users (
  id text primary key,
  email text,
  created_at timestamptz default now()
);

create table public.optimizations (
  id uuid default gen_random_uuid() primary key,
  user_id text references public.users(id) on delete cascade,
  job_title text,
  company_name text,
  job_description text,
  original_resume text,
  optimized_resume text,
  cover_letter text,
  ats_score_before int,
  ats_score_after int,
  missing_keywords text[],
  improvements text[],
  weak_bullets text[],
  score_breakdown jsonb,
  interview_prep jsonb,
  created_at timestamptz default now()
);

alter table public.users disable row level security;
alter table public.optimizations disable row level security;
```

5. Run the dev server
```bash
npm run dev
```

Open http://localhost:3000

---

## Project structure
```
src/
├── app/
│   ├── api/
│   │   ├── optimize/route.ts       # Main AI optimization endpoint
│   │   ├── usage/route.ts          # Usage tracking
│   │   ├── history/route.ts        # GET + DELETE history
│   │   └── scrape-jd/route.ts      # Job description URL scraper
│   ├── history/page.tsx            # Optimization history page
│   ├── sign-in/[[...sign-in]]/     # Clerk sign in
│   ├── sign-up/[[...sign-up]]/     # Clerk sign up
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                    # Main app page
├── lib/
│   ├── gemini.ts                   # AI provider fallback chain
│   ├── redis.ts                    # Usage tracking with Upstash
│   ├── supabase.ts                 # Client-side Supabase
│   ├── supabase-server.ts          # Server-side Supabase admin client
│   └── download.ts                 # PDF + DOCX generation
└── proxy.ts                        # Clerk middleware
```

---

## Features in detail

### ATS scoring

The AI performs mechanical keyword counting against the top 15 JD keywords, top 5 required qualifications, and required technical skills. Scores are weighted: keyword match (40%), experience relevance (30%), skills alignment (20%), formatting (10%). Realistic improvement range is 10-20 points.

### Regeneration

After an initial optimization, users can regenerate with a different focus without using a free optimization. Available modes: Max ATS aggressive, Preserve my style, Shorter bullets, Senior/confident tone, Entry level tone, Add more metrics, Custom instruction. Free users get 1 regeneration per optimization.

### PDF parsing

Uses pdfjs-dist with coordinate-based extraction to reconstruct resume structure from raw PDF bytes. Groups text items by Y coordinate to detect lines, measures line spacing to detect section breaks, and validates output quality before accepting. Falls back to plain text if structure detection fails.

### Multi-provider AI

All providers share the same system prompt and user prompt. The prompt instructs the AI to build a locked technology map per project before rewriting — preventing fabrication of technologies. Regeneration injects a modifier block at the highest priority position in the prompt, overriding default behavior.

---

## Deployment

The app is deployed on Vercel. To deploy your own instance:

1. Push to GitHub
2. Import the repo on vercel.com
3. Add all environment variables from `.env.local`
4. Deploy

Vercel automatically sets `NODE_ENV=production` which enables real usage enforcement.

---

## License

MIT
