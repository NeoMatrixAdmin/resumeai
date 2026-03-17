import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Mistral } from '@mistralai/mistralai';
import Cerebras from '@cerebras/cerebras_cloud_sdk';

export interface OptimizeResult {
  optimizedResume: string;
  coverLetter: string;
  atsScoreBefore: number;
  atsScoreAfter: number;
  missingKeywords: string[];
  improvements: string[];
  weakBullets: string[];
  interviewPrep: {
    topicsToStudy: string[];
    likelyQuestions: string[];
    skillGaps: string[];
  };
  scoreBreakdown: {
    before: { keywordMatch: number; experienceRelevance: number; skillsAlignment: number; formatting: number; };
    after: { keywordMatch: number; experienceRelevance: number; skillsAlignment: number; formatting: number; };
  };
  modelUsed?: string;
}

const SYSTEM_PROMPT = `You are the world's most aggressive and precise resume optimizer. You have two absolute rules:

RULE 1 — NEVER FABRICATE:
- Never add a technology to a project not explicitly listed for that project in the original
- Never add a metric, number, or percentage not in the original resume
- Never move a technology from one project to another
- Never infer that a project "probably used" something
- If it is not written in the original, it does not exist

RULE 2 — MAXIMIZE ATS SCORE LEGITIMATELY:
- Reframe every bullet using exact JD terminology
- Mine every JD keyword and weave it into bullets where truthful
- Make every word earn its place
- A rewrite that doesn't add JD keywords has failed

You always respond with valid raw JSON only — no markdown, no code fences, no explanation.`;

function buildPrompt(resumeText: string, jobDescription: string, modifier?: string): string {
  const modifierBlock = modifier ? `
═══════════════════════════════════════════════════════════
⚠ REGENERATION INSTRUCTION — HIGHEST PRIORITY ⚠
This is a regeneration request. The user has given a specific instruction that OVERRIDES your default approach.
You MUST follow this instruction above everything else in this prompt:

"${modifier}"

Every decision you make — how aggressively you rewrite, what tone you use, how long bullets are, what to prioritize — must be filtered through this instruction first. If the instruction conflicts with any other rule in this prompt, the instruction wins.
═══════════════════════════════════════════════════════════
` : '';

  return `${modifierBlock}Optimize this resume for the target job. Follow the phases exactly.

ORIGINAL RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

═══════════════════════════════════════════════════════════
BEFORE YOU WRITE ANYTHING — BUILD THIS MAP:
═══════════════════════════════════════════════════════════

Read the resume. For each project list ONLY technologies explicitly mentioned for that project in the original. This is your locked reference — you cannot add to it.

Project 1: [name] → technologies: [only what's in original for this project]
Project 2: [name] → technologies: [only what's in original for this project]
Project 3: [name] → technologies: [only what's in original for this project]
Project 4: [name] → technologies: [only what's in original for this project]

You will ONLY mention a technology in a project's bullets if it appears in that project's locked list.

═══════════════════════════════════════════════════════════
STEP 1 — SCORE THE ORIGINAL (mechanical counting, not estimation)
═══════════════════════════════════════════════════════════

Extract the top 15 keywords/technologies/phrases from the JD.
Count exactly how many appear in the original resume.
keywordMatch = round((count/15) × 100)

List the top 5 required qualifications from the JD.
Count how many the resume directly addresses.
experienceRelevance = round((count/5) × 100)

List all required + preferred technical skills from JD.
Count how many appear anywhere in the resume's skills section.
skillsAlignment = round((matches/total) × 100)

formatting: 85 = clean consistent sections. 75 = acceptable. 60 = messy.
atsScoreBefore = round((keywordMatch×0.4) + (experienceRelevance×0.3) + (skillsAlignment×0.2) + (formatting×0.1))

SCORING HONESTY RULE:
If the JD lists specific required technologies (Node.js, React, specific frameworks) that do NOT appear anywhere in the resume, the experienceRelevance score must reflect this gap. A resume missing 3+ required technologies cannot score above 70 on experienceRelevance. Be honest — an inflated score helps nobody.

═══════════════════════════════════════════════════════════
STEP 2 — JD KEYWORD CHECKLIST
═══════════════════════════════════════════════════════════

Before rewriting, build a checklist of every important keyword from the JD.
For each keyword ask: can this be truthfully added to any bullet in the resume?
If yes — it MUST be added. No exceptions.
This is how you maximize ATS score without fabricating.

═══════════════════════════════════════════════════════════
STEP 3 — AGGRESSIVE REWRITE
═══════════════════════════════════════════════════════════

WHAT YOU CAN CHANGE:
- Every word used to describe existing work
- Action verbs (make them stronger)
- Framing and emphasis
- Order of bullets within sections (most JD-relevant first)
- Order within existing skill categories (reorder items within a category, never add new items or new categories)
- The summary entirely

WHAT YOU CANNOT CHANGE:
- The order of projects (keep original order — do NOT reorder projects based on JD relevance)
- The skills section categories (do NOT add new skill categories that don't exist in the original)
- CGPA and academic scores in the education section — never remove these
- Do NOT add parenthetical clarifications to skills (e.g. "Python (Object-Oriented Programming)" is wrong — keep it as "Python")
- Do NOT add explanatory text inside skill categories
- Do NOT add skills the candidate has not listed (if JavaScript is not in the original skills, do not add it)
- Which technologies appear in which project
- Any metrics, numbers, percentages
- Project names, company names, job titles, dates
- Education section
- Candidate name and contact info

BULLET TRANSFORMATION — apply this to EVERY bullet:
1. DECODE: Strip all fluff. What is the raw technical work done here?
2. MATCH: Which JD keyword from your checklist best describes this work?
3. REFRAME: Rewrite using the JD's exact terminology for the same work
4. STRENGTHEN: Strong action verb + technical approach + outcome/scope
5. CHECK: JD keyword present? Strong verb? Outcome? No to any = rewrite again
6. VERIFY: Is every technology mentioned in this bullet in that project's locked list? No = remove it

DEDUPLICATION — mandatory before finalizing:
Read every bullet you wrote. If two bullets in the same project describe the same core action — keep the stronger one, delete the other. Every bullet must describe a DIFFERENT piece of work.

CONCRETE EXAMPLES — surface vs deep:

Original: "Implemented LLM task decomposition, iterative reasoning workflows, and automated structured report generation"
JD requires: "pipeline orchestration", "asynchronous processing"
BAD: "Implemented LLM task decomposition...using Tool Orchestration"
GOOD: "Orchestrated asynchronous LLM task decomposition and iterative reasoning pipelines to automate end-to-end structured report generation across a 5-agent workflow"

Original: "Designed relational database schemas and optimized queries for scalable user interactions"
JD requires: "PostgreSQL", "query optimization", "database performance"
BAD: "Designed relational database schemas and optimized queries using SQL"
GOOD: "Architected PostgreSQL schemas and optimized query execution plans to support scalable user interactions across authentication, feed generation, and profile management features"

Original: "Built a full-stack web platform with secure authentication using Google OAuth 2.0 and JWT"
JD requires: "JWT authentication", "OAuth", "secure APIs"
BAD: "Built a full-stack web platform with secure authentication using Django and PostgreSQL"
GOOD: "Engineered a full-stack web platform with JWT and Google OAuth 2.0 authentication, implementing secure token validation and session management for the REST API layer"

BANNED PHRASES:
"utilizing" → always "using"
"leveraging" → always "using"
"ensuring [vague outcome]" → cut the ending
"enhancing user experience" → cut entirely
"enhancing system usability" → cut entirely
"with a focus on" → rewrite the sentence
"strong foundation in" → cut
"best practices" → name the specific practice
"seamless", "robust", "dynamic" → cut
"demonstrated my ability to" → cut
"I used X to achieve this" → rewrite

═══════════════════════════════════════════════════════════
STEP 4 — SUMMARY (2 sentences, hard limit, no exceptions)
═══════════════════════════════════════════════════════════

S1: [Exact job title from JD] (Class of [graduation year from resume]) with experience in [top 2 technical domains from JD that candidate actually has based on their skills section].
S2: Built [specific project type matching JD domain] using [top 3 JD-required technologies that appear in resume skills section], [one real achievement — the ~90% reduction if relevant, otherwise a qualitative scope].

HARD RULES:
- "Class of 2026" in parentheses — never mid-sentence
- Never "with a focus on", "keen interest", "strong foundation", "passionate about"
- Every word must be a verifiable fact from the resume
- If the sentence could describe any developer, rewrite it

═══════════════════════════════════════════════════════════
STEP 5 — SCORE THE OPTIMIZED RESUME
═══════════════════════════════════════════════════════════

Repeat the exact same mechanical counting from Step 1 on your NEW resume.
Count the JD keywords now present. Be honest.
Realistic improvement from deep rewriting: 10-20 points.
Less than 8 = rewrite was not deep enough, go back.
More than 25 = you inflated the after score, correct it.

═══════════════════════════════════════════════════════════
STEP 6 — COVER LETTER (write this exceptionally — this is what gets interviews)
═══════════════════════════════════════════════════════════

NAME EXTRACTION — critical:
The name is the very first line of the resume. It is 2-3 words only.
It ends before any newline, comma, city, phone, or email.
"Achal Ambiger\nBangalore..." → name is "Achal Ambiger" only.
Never include a city or country in the name.

WRITE ENTIRELY IN FIRST PERSON:
Every sentence uses "I", "My", or starts with a project name.
NEVER write "[Name] is applying" or "[Name] has experience" — always first person.
A cover letter written in third person is an automatic failure.

4 tight paragraphs — write like a confident senior engineer, not an eager student:

P1 (2 sentences — make them count):
- "I am applying for the [exact role name] at [exact company name]."
- One sharp, specific observation about this company that shows you read the JD carefully. Their specific tech stack, product scale, engineering challenge, or domain. NOT "I admire your mission" or "I am drawn to your innovative culture."

P2 (2-3 sentences — your strongest argument):
- Open with your single most relevant technical credential for their biggest stated need
- Be concrete — name the technology, describe what it did
- If the ~90% metric is relevant to this role, use it here. If not, use qualitative scope.

P3 (2-3 sentences — show your work):
- Name your single most relevant project for this specific JD
- What you built + the key technical decision that made it work + the real outcome
- Name the actual technologies. Be specific. This is what they'll ask about in the interview.

P4 (2 sentences — close confidently):
- "I would welcome the opportunity to discuss how my experience with [2-3 specific technologies relevant to this JD] maps to [specific stated need from JD]."
- "I am available for an interview at your convenience."

ABSOLUTE BAN LIST — if any of these appear, the cover letter has failed:
"I am excited to" → rewrite
"I am passionate about" → rewrite
"I would be a great fit" → delete
"I believe" → delete
"I am a fast learner" → delete
"I look forward to hearing from you" → delete
"my skills and experience align" → delete
"I am confident that" → delete
"make a positive impact" → delete
"utilizing" → use "using"
"leveraging" → use "using"
Any sentence written in third person → rewrite in first person
"demonstrated my ability to" → rewrite
"looking forward to discussing" → use "I would welcome discussing"
"I used X to achieve Y" → rewrite as "X enabled Y" or name the outcome directly

═══════════════════════════════════════════════════════════
STEP 7 — FEEDBACK
═══════════════════════════════════════════════════════════

improvements: For each major change — WHAT bullet changed → HOW it changed → WHY that specific change helps with this JD.
weakBullets: After your best effort, which bullets are still weak? Name the exact bullet, explain why, what real experience would fix it.
missingKeywords: JD keywords genuinely absent from the ENTIRE resume including the skills section. If a technology appears ANYWHERE in the resume it is NOT missing.

interviewPrep:
topicsToStudy: Specific technical gaps. Specific enough to Google tonight.
likelyQuestions: Real questions this specific interviewer asks this specific candidate for this role.
skillGaps: What this JD requires that the resume does not show. Direct. No softening.

═══════════════════════════════════════════════════════════
OUTPUT — raw JSON only, zero markdown, zero explanation:
═══════════════════════════════════════════════════════════
{
  "optimizedResume": "Full rewritten resume. Same structure, same sections, same order, same casing as original. Only bullets and summary changed. Use \\n for newlines.",
  "coverLetter": "4 paragraphs. \\n\\n between paragraphs. First person throughout. Name from first line of resume only. No banned phrases.",
  "atsScoreBefore": 0,
  "atsScoreAfter": 0,
  "scoreBreakdown": {
    "before": { "keywordMatch": 0, "experienceRelevance": 0, "skillsAlignment": 0, "formatting": 0 },
    "after": { "keywordMatch": 0, "experienceRelevance": 0, "skillsAlignment": 0, "formatting": 0 }
  },
  "missingKeywords": ["actual JD keyword genuinely absent from entire resume"],
  "improvements": ["Exact bullet → what changed → why it helps this specific JD"],
  "weakBullets": ["Exact bullet → why still weak → what real experience would fix it"],
  "interviewPrep": {
    "topicsToStudy": ["Specific technical topic + specific enough to Google tonight"],
    "likelyQuestions": ["Real question this interviewer asks this specific candidate"],
    "skillGaps": ["Specific: what JD requires → what resume shows instead"]
  }
}`;
}

function parseResult(text: string, modelName: string): OptimizeResult {
  const clean = text.replace(/```json|```/g, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch {
    // Attempt to close truncated JSON
    const lastBrace = clean.lastIndexOf('"}');
    if (lastBrace > 0) {
      try {
        parsed = JSON.parse(clean.slice(0, lastBrace + 2) + '}');
      } catch {
        throw new Error('Failed to parse AI response');
      }
    } else {
      throw new Error('Failed to parse AI response');
    }
  }
  return {
    optimizedResume: parsed.optimizedResume ?? '',
    coverLetter: parsed.coverLetter ?? '',
    atsScoreBefore: parsed.atsScoreBefore ?? 0,
    atsScoreAfter: parsed.atsScoreAfter ?? 0,
    missingKeywords: parsed.missingKeywords ?? [],
    improvements: parsed.improvements ?? [],
    weakBullets: parsed.weakBullets ?? [],
    interviewPrep: {
      topicsToStudy: parsed.interviewPrep?.topicsToStudy ?? [],
      likelyQuestions: parsed.interviewPrep?.likelyQuestions ?? [],
      skillGaps: parsed.interviewPrep?.skillGaps ?? [],
    },
    scoreBreakdown: {
      before: parsed.scoreBreakdown?.before ?? { keywordMatch: 0, experienceRelevance: 0, skillsAlignment: 0, formatting: 0 },
      after: parsed.scoreBreakdown?.after ?? { keywordMatch: 0, experienceRelevance: 0, skillsAlignment: 0, formatting: 0 },
    },
    modelUsed: modelName,
  };
}

function isQuotaError(message: string): boolean {
  return (
    message.includes('quota') ||
    message.includes('rate') ||
    message.includes('429') ||
    message.includes('exceeded') ||
    message.includes('limit') ||
    message.includes('insufficient') ||
    message.includes('Resource has been exhausted') ||
    message.includes('RESOURCE_EXHAUSTED')
  );
}

// ── Gemini helper ─────────────────────────────────────────────
async function tryGeminiModel(
  modelName: string,
  apiKey: string,
  resume: string,
  jd: string,
  modifier?: string,
  label?: string
): Promise<OptimizeResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const maxTokens = modelName.includes('2.5') ? 32000 : 16000;
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { temperature: 0.15, maxOutputTokens: 16000 },
    systemInstruction: SYSTEM_PROMPT,
  });
  const result = await model.generateContent(buildPrompt(resume, jd, modifier));
  return parseResult(result.response.text(), label ?? modelName);
}

// ── Gemini providers — 6 models × 2 keys = 12 providers ──────
const g1 = process.env.GEMINI_API_KEY!;
const g2 = process.env.GEMINI_API_KEY_2!;

async function tryGemini25FlashK1(r: string, jd: string, m?: string) { return tryGeminiModel('gemini-2.5-flash', g1, r, jd, m, 'gemini-2.5-flash (key 1)'); }
async function tryGemini25FlashK2(r: string, jd: string, m?: string) { return tryGeminiModel('gemini-2.5-flash', g2, r, jd, m, 'gemini-2.5-flash (key 2)'); }
async function tryGeminiFlashLatestK1(r: string, jd: string, m?: string) { return tryGeminiModel('gemini-flash-latest', g1, r, jd, m, 'gemini-flash-latest (key 1)'); }
async function tryGeminiFlashLatestK2(r: string, jd: string, m?: string) { return tryGeminiModel('gemini-flash-latest', g2, r, jd, m, 'gemini-flash-latest (key 2)'); }
async function tryGemini3FlashK1(r: string, jd: string, m?: string) { return tryGeminiModel('gemini-3-flash-preview', g1, r, jd, m, 'gemini-3-flash-preview (key 1)'); }
async function tryGemini3FlashK2(r: string, jd: string, m?: string) { return tryGeminiModel('gemini-3-flash-preview', g2, r, jd, m, 'gemini-3-flash-preview (key 2)'); }
async function tryGemini31FlashLiteK1(r: string, jd: string, m?: string) { return tryGeminiModel('gemini-3.1-flash-lite-preview', g1, r, jd, m, 'gemini-3.1-flash-lite (key 1)'); }
async function tryGemini31FlashLiteK2(r: string, jd: string, m?: string) { return tryGeminiModel('gemini-3.1-flash-lite-preview', g2, r, jd, m, 'gemini-3.1-flash-lite (key 2)'); }
async function tryGemini25FlashLiteK1(r: string, jd: string, m?: string) { return tryGeminiModel('gemini-2.5-flash-lite', g1, r, jd, m, 'gemini-2.5-flash-lite (key 1)'); }
async function tryGemini25FlashLiteK2(r: string, jd: string, m?: string) { return tryGeminiModel('gemini-2.5-flash-lite', g2, r, jd, m, 'gemini-2.5-flash-lite (key 2)'); }
async function tryGeminiFlashLiteLatestK1(r: string, jd: string, m?: string) { return tryGeminiModel('gemini-flash-lite-latest', g1, r, jd, m, 'gemini-flash-lite-latest (key 1)'); }
async function tryGeminiFlashLiteLatestK2(r: string, jd: string, m?: string) { return tryGeminiModel('gemini-flash-lite-latest', g2, r, jd, m, 'gemini-flash-lite-latest (key 2)'); }

// ── Non-Gemini providers ──────────────────────────────────────
async function tryCerebras(resume: string, jd: string, modifier?: string): Promise<OptimizeResult> {
  const cerebras = new Cerebras({ apiKey: process.env.CEREBRAS_API_KEY! });
  const completion = await cerebras.chat.completions.create({
    model: 'qwen-3-235b-a22b-instruct-2507',
    temperature: 0.15,
    max_tokens: 8000,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildPrompt(resume, jd, modifier) },
    ],
  }) as unknown as { choices: { message: { content: string } }[] };
  const text = completion.choices?.[0]?.message?.content ?? '';
  return parseResult(text, 'cerebras-qwen-235b');
}

async function tryGroqLlama33(resume: string, jd: string, modifier?: string): Promise<OptimizeResult> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.15,
    max_tokens: 8000,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildPrompt(resume, jd, modifier) },
    ],
  });
  return parseResult(completion.choices[0]?.message?.content ?? '', 'groq-llama-3.3-70b');
}

async function tryGroqLlama31(resume: string, jd: string, modifier?: string): Promise<OptimizeResult> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });
  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-70b-versatile',
    temperature: 0.15,
    max_tokens: 8000,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildPrompt(resume, jd, modifier) },
    ],
  });
  return parseResult(completion.choices[0]?.message?.content ?? '', 'groq-llama-3.1-70b');
}

async function tryGroqMixtral(resume: string, jd: string, modifier?: string): Promise<OptimizeResult> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });
  const completion = await groq.chat.completions.create({
    model: 'mixtral-8x7b-32768',
    temperature: 0.15,
    max_tokens: 8000,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildPrompt(resume, jd, modifier) },
    ],
  });
  return parseResult(completion.choices[0]?.message?.content ?? '', 'groq-mixtral-8x7b');
}

async function tryMistral(resume: string, jd: string, modifier?: string): Promise<OptimizeResult> {
  const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! });
  const completion = await mistral.chat.complete({
    model: 'mistral-small-latest',
    temperature: 0.15,
    maxTokens: 8000,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildPrompt(resume, jd, modifier) },
    ],
  });
  const raw = completion.choices?.[0]?.message?.content;
  let textStr = '';
  if (typeof raw === 'string') {
    textStr = raw;
  } else if (Array.isArray(raw)) {
    textStr = raw
      .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
      .map(c => c.text)
      .join('');
  }
  return parseResult(textStr, 'mistral-small');
}

// ── Main export ───────────────────────────────────────────────
export async function optimizeResume(
  resumeText: string,
  jobDescription: string,
  modifier?: string
): Promise<OptimizeResult> {

  const providers = [
    // Gemini 2.5 Flash — best quality, thinking model
    { name: 'Gemini 2.5 Flash (key 1)',        fn: tryGemini25FlashK1,        needsKey: !!process.env.GEMINI_API_KEY },
    { name: 'Gemini 2.5 Flash (key 2)',        fn: tryGemini25FlashK2,        needsKey: !!process.env.GEMINI_API_KEY_2 },
    // Gemini Flash Latest — alias for latest flash
    { name: 'Gemini Flash Latest (key 1)',     fn: tryGeminiFlashLatestK1,    needsKey: !!process.env.GEMINI_API_KEY },
    { name: 'Gemini Flash Latest (key 2)',     fn: tryGeminiFlashLatestK2,    needsKey: !!process.env.GEMINI_API_KEY_2 },
    // Gemini 3 Flash Preview — separate quota
    { name: 'Gemini 3 Flash Preview (key 1)', fn: tryGemini3FlashK1,         needsKey: !!process.env.GEMINI_API_KEY },
    { name: 'Gemini 3 Flash Preview (key 2)', fn: tryGemini3FlashK2,         needsKey: !!process.env.GEMINI_API_KEY_2 },
    // Gemini 3.1 Flash Lite — separate quota
    { name: 'Gemini 3.1 Flash Lite (key 1)',  fn: tryGemini31FlashLiteK1,    needsKey: !!process.env.GEMINI_API_KEY },
    { name: 'Gemini 3.1 Flash Lite (key 2)',  fn: tryGemini31FlashLiteK2,    needsKey: !!process.env.GEMINI_API_KEY_2 },
    // Gemini 2.5 Flash Lite — lighter fallback
    { name: 'Gemini 2.5 Flash Lite (key 1)',  fn: tryGemini25FlashLiteK1,    needsKey: !!process.env.GEMINI_API_KEY },
    { name: 'Gemini 2.5 Flash Lite (key 2)',  fn: tryGemini25FlashLiteK2,    needsKey: !!process.env.GEMINI_API_KEY_2 },
    // Gemini Flash Lite Latest — last Gemini fallback
    { name: 'Gemini Flash Lite Latest (key 1)', fn: tryGeminiFlashLiteLatestK1, needsKey: !!process.env.GEMINI_API_KEY },
    { name: 'Gemini Flash Lite Latest (key 2)', fn: tryGeminiFlashLiteLatestK2, needsKey: !!process.env.GEMINI_API_KEY_2 },
    // Non-Gemini fallbacks
    { name: 'Cerebras Qwen 235B',             fn: tryCerebras,               needsKey: !!process.env.CEREBRAS_API_KEY },
    { name: 'Groq Llama 3.3 70B',             fn: tryGroqLlama33,            needsKey: !!process.env.GROQ_API_KEY },
    { name: 'Groq Llama 3.1 70B',             fn: tryGroqLlama31,            needsKey: !!process.env.GROQ_API_KEY },
    { name: 'Groq Mixtral 8x7B',              fn: tryGroqMixtral,            needsKey: !!process.env.GROQ_API_KEY },
    { name: 'Mistral Small',                  fn: tryMistral,                needsKey: !!process.env.MISTRAL_API_KEY },
  ];

  let lastError: Error | null = null;

  for (const provider of providers) {
    if (!provider.needsKey) {
      console.log(`Skipping ${provider.name} — no API key configured`);
      continue;
    }
    try {
      console.log(`Trying: ${provider.name}`);
      const result = await provider.fn(resumeText, jobDescription, modifier);
      console.log(`✓ Success: ${provider.name}`);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`✗ ${provider.name} failed: ${message.slice(0, 120)}`);
      lastError = err instanceof Error ? err : new Error(message);
      continue;
    }
  }

  throw lastError ?? new Error('All AI providers exhausted. Please try again in a few minutes.');
}