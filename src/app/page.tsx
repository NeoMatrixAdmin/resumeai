'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Briefcase, Copy, Check, AlertCircle, ArrowRight, Sparkles, TrendingUp, AlertTriangle, BookOpen, MessageSquare, Target } from 'lucide-react';
import Link from 'next/link';
import { UserButton, useUser, SignInButton } from '@clerk/nextjs';

function getFingerprint(): string {
  const key = 'rz_fp';
  let fp = localStorage.getItem(key);
  if (!fp) {
    fp = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(key, fp);
  }
  return fp;
}

interface ScoreBreakdown {
  keywordMatch: number;
  experienceRelevance: number;
  skillsAlignment: number;
  formatting: number;
}

interface OptimizeResult {
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
    before: ScoreBreakdown;
    after: ScoreBreakdown;
  };
  modelUsed?: string;
  usageCount: number;
  usageRemaining: number;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all"
      style={{ background: copied ? 'var(--green-dim)' : 'var(--surface-2)', color: copied ? 'var(--green)' : 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer' }}>
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const [displayed, setDisplayed] = useState(0);
  const r = 28;
  const circ = 2 * Math.PI * r;
  const filled = (displayed / 100) * circ;
  const color = score >= 75 ? '#4ade80' : score >= 50 ? '#d4a853' : '#f87171';

  useEffect(() => {
    setDisplayed(0);
    let start = 0;
    const duration = 1200;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      start = Math.round(eased * score);
      setDisplayed(start);
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [score]);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${filled} ${circ - filled}`} strokeDashoffset={circ / 4}
          strokeLinecap="round" />
        <text x="36" y="33" textAnchor="middle" fill={color}
          style={{ fontFamily: 'DM Mono', fontSize: '14px', fontWeight: 500 }}>{displayed}</text>
        <text x="36" y="46" textAnchor="middle" fill="var(--text-muted)"
          style={{ fontFamily: 'DM Sans', fontSize: '9px' }}>/ 100</text>
      </svg>
      <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}

function ScoreBar({ label, before, after }: { label: string; before: number; after: number }) {
  const [displayedAfter, setDisplayedAfter] = useState(0);
  const afterColor = after >= 70 ? 'var(--green)' : after >= 50 ? 'var(--accent)' : 'var(--red)';

  useEffect(() => {
    setDisplayedAfter(0);
    const duration = 1400;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayedAfter(Math.round(eased * after));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [after]);

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</span>
        <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through', marginRight: 6 }}>{before}</span>
          {displayedAfter}
        </span>
      </div>
      <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: `${before}%`, height: '100%', background: 'var(--border)', borderRadius: 2 }} />
        <div style={{ position: 'absolute', left: 0, top: 0, width: `${displayedAfter}%`, height: '100%', background: afterColor, borderRadius: 2 }} />
      </div>
    </div>
  );
}

function LoadingProgress() {
  const steps = [
    'Reading your resume...',
    'Analyzing job description...',
    'Mapping keywords to bullets...',
    'Rewriting bullet points...',
    'Scoring ATS match...',
    'Generating cover letter...',
    'Finalizing output...',
  ];
  const pcts = [10, 24, 38, 54, 70, 84, 96];
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timings = [1200, 2500, 3500, 5000, 4000, 4000, 2000];
    let current = 0;
    const advance = () => {
      if (current < steps.length - 1) {
        current++;
        setStep(current);
        setTimeout(advance, timings[current]);
      }
    };
    const t = setTimeout(advance, timings[0]);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ width: '100%', padding: '2px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[0, 1, 2].map(i => (
              <span key={i} className="pulse-dot inline-block w-1 h-1 rounded-full"
                style={{ background: 'var(--accent)', animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
          <span className="font-mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {steps[step]}
          </span>
        </div>
        <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {pcts[Math.min(step, pcts.length - 1)]}%
        </span>
      </div>
      <div style={{ height: 2, background: 'var(--border)', borderRadius: 1, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pcts[Math.min(step, pcts.length - 1)]}%`,
          background: 'var(--accent)',
          borderRadius: 1,
          transition: 'width 1.5s ease',
        }} />
      </div>
    </div>
  );
}

const REGEN_OPTIONS = [
  {
    value: 'Rewrite this resume with maximum ATS aggression — inject every possible JD keyword naturally, prioritize ATS score above all else, accept slightly less natural phrasing if it means higher keyword density',
    label: 'Max ATS aggressive',
  },
  {
    value: "Rewrite with minimal changes — only add missing keywords where they fit naturally, preserve the candidate's original voice and phrasing as much as possible",
    label: 'Preserve my style',
  },
  {
    value: 'Rewrite all bullets to be shorter and punchier — maximum one tight line each, cut all filler, every word must earn its place',
    label: 'Shorter bullets',
  },
  {
    value: 'Rewrite with a senior engineer tone — use assertive language, strong ownership verbs like architected/led/owned/drove, frame every project as a confident senior contributor',
    label: 'Senior/confident tone',
  },
  {
    value: 'Rewrite for an internship or entry-level role — softer claims, emphasize learning and contribution, frame projects as collaborative and initiative-driven',
    label: 'Entry level tone',
  },
  {
    value: 'Focus on adding metrics and scope to every bullet — find every possible place to add qualitative or quantitative scale, use phrases like "across X modules", "for Y agents", "handling Z features"',
    label: 'Add more metrics',
  },
  { value: 'custom', label: '✏ Custom instruction' },
];

export default function Home() {
  const { user, isLoaded } = useUser();
  const [resumeText, setResumeText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'resume' | 'cover'>('resume');
  const [activeSection, setActiveSection] = useState<'analysis' | 'prep'>('analysis');
  const [usageCount, setUsageCount] = useState(0);
  const [pdfQualityWarning, setPdfQualityWarning] = useState(false);
  const [pendingRawText, setPendingRawText] = useState('');
  const [pdfIsStructured, setPdfIsStructured] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [regenModifier, setRegenModifier] = useState('');
  const [regenCustom, setRegenCustom] = useState('');
  const [regenLoading, setRegenLoading] = useState(false);
  const [showRegenCustom, setShowRegenCustom] = useState(false);
  const [prevResult, setPrevResult] = useState<OptimizeResult | null>(null);
  const [lastRegenModifier, setLastRegenModifier] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [linkedinError, setLinkedinError] = useState('');
  const [regenCount, setRegenCount] = useState(0);
  const MAX_REGENS = 1;
  const resultsRef = useRef<HTMLDivElement>(null);
  const FREE_LIMIT = 2;
  const isDev = process.env.NODE_ENV === 'development';
  const isAdminUser = user?.id === process.env.NEXT_PUBLIC_ADMIN_USER_ID;
  const usageRemaining = isDev || isAdminUser ? FREE_LIMIT : FREE_LIMIT - usageCount;

  useEffect(() => {
    const reopened = localStorage.getItem('rz_reopen');
    if (reopened) {
      try {
        const parsed = JSON.parse(reopened);
        setResult(parsed);
        localStorage.removeItem('rz_reopen');
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
      } catch {
        localStorage.removeItem('rz_reopen');
      }
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const fp = getFingerprint();
    const usageKey = user?.id || fp;
    fetch('/api/usage?fp=' + usageKey)
      .then(r => r.json())
      .then(d => setUsageCount(d.count ?? 0))
      .catch(() => {});
  }, [isLoaded, user]);

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (file.type === 'text/plain') {
      const text = await file.text();
      setResumeText(text);
      setUploadedFileName(file.name);
      setPdfIsStructured(true);
      return;
    }
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      type TextItem = { str: string; transform: number[]; height: number };
      const allLines: { y: number; text: string; x: number; fontSize: number }[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1 });
        const pageHeight = viewport.height;
        const items = content.items as TextItem[];
        const lineMap = new Map<number, { parts: string[]; x: number; fontSize: number }>();

        for (const item of items) {
          if (!item.str) continue;
          const rawY = item.transform[5];
          const x = item.transform[4];
          const fontSize = item.height || 10;
          const y = Math.round((pageHeight - rawY) / 3) * 3;
          if (!lineMap.has(y)) lineMap.set(y, { parts: [], x, fontSize });
          lineMap.get(y)!.parts.push(item.str);
        }

        const sortedYs = Array.from(lineMap.keys()).sort((a, b) => a - b);
        let prevY: number | null = null;
        for (const y of sortedYs) {
          const { parts, x, fontSize } = lineMap.get(y)!;
          const lineText = parts.join('').replace(/\s+/g, ' ').trim();
          if (!lineText) continue;
          if (prevY !== null && y - prevY > 18) allLines.push({ y: -1, text: '', x: 0, fontSize: 0 });
          allLines.push({ y, text: lineText, x, fontSize });
          prevY = y;
        }
        if (pageNum < pdf.numPages) allLines.push({ y: -1, text: '', x: 0, fontSize: 0 });
      }

      const nonBlankLines = allLines.filter(l => l.text.length > 0);
      const avgLineLength = nonBlankLines.reduce((s, l) => s + l.text.length, 0) / (nonBlankLines.length || 1);
      const hasShortLines = nonBlankLines.filter(l => l.text.length < 80).length > nonBlankLines.length * 0.4;
      const hasSections = nonBlankLines.some(l => l.text === l.text.toUpperCase() && l.text.length > 2 && l.text.length < 40);
      const isGoodQuality = nonBlankLines.length > 8 && avgLineLength < 120 && hasShortLines && hasSections;
      const extractedText = allLines.map(l => l.text).join('\n').replace(/\n{3,}/g, '\n\n').trim();

      if (isGoodQuality) {
        setResumeText(extractedText);
        setPdfIsStructured(true);
        setPdfQualityWarning(false);
        setUploadedFileName(file.name);
      } else {
        setPendingRawText(extractedText);
        setPdfIsStructured(false);
        setPdfQualityWarning(true);
      }
    } catch {
      setError('Could not read this PDF. Please paste your resume text instead.');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'text/plain': ['.txt'] },
    maxFiles: 1,
  });

  const callOptimize = async (modifier?: string) => {
    const fp = getFingerprint();
    const res = await fetch('/api/optimize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ resumeText, jobDescription, fingerprint: fp, modifier }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  };

  const handleGenerate = async () => {
    if (!user) {
      // Trigger sign in modal
      document.querySelector<HTMLButtonElement>('[data-clerk-sign-in]')?.click();
      setError('Please sign in to optimize your resume.');
      return;
    }
    if (!resumeText.trim()) { setError('Please add your resume.'); return; }
    if (!jobDescription.trim()) { setError('Please paste a job description.'); return; }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const data = await callOptimize();
      setResult(data);
      setRegenCount(0);
      setUsageCount(data.usageCount);
      setRegenModifier('');
      setRegenCustom('');
      setShowRegenCustom(false);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      if (msg === 'FREE_LIMIT_REACHED') {
        setError("You've used your 2 free optimizations. Paid plans coming soon!");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) return;
    const modifier = regenModifier === 'custom' ? regenCustom.trim() : regenModifier;
    if (!modifier) { setError('Please select a regeneration option.'); return; }

    // Enforce regen limit for non-admin users
    if (!isAdminUser && regenCount >= MAX_REGENS) {
      setError('You have used your 1 free regeneration. Generate a new optimization to get another.');
      return;
    }

    setError('');
    setRegenLoading(true);

    try {
      const data = await callOptimize(modifier);
      setResult(data);
      if (!isAdminUser) setRegenCount(prev => prev + 1);
      setLastRegenModifier(regenModifier === 'custom' ? regenCustom.trim() : REGEN_OPTIONS.find(o => o.value === regenModifier)?.label ?? modifier);
      setPrevResult(result);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setRegenLoading(false);
    }
  };
  const handleLinkedinScrape = async () => {
    if (!linkedinUrl.trim()) return;
    setLinkedinLoading(true);
    setLinkedinError('');
    try {
      const res = await fetch('/api/scrape-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkedinUrl }),
      });
      const data = await res.json();
      if (!res.ok || !data.text) {
        setLinkedinError("Couldn't fetch this URL, paste the JD manually.");
        return;
      }
      setJobDescription(data.text);
      setLinkedinUrl('');
    } catch {
      setLinkedinError("Couldn't fetch this URL, paste the JD manually.");
    } finally {
      setLinkedinLoading(false);
    }
  };
  const handleDownload = async () => {
    if (!result || downloading) return;
    setDownloading(true);
    try {
      const firstLine = result.optimizedResume.split('\n')[0] ?? '';
      const name = firstLine
        .split(/[,•|]/)[0]
        .replace(/\b(Bangalore|Mumbai|Delhi|Chennai|Hyderabad|Pune|India|USA|UK)\b.*/i, '')
        .trim() || 'Candidate';
      if (activeTab === 'resume') {
        if (!pdfIsStructured) {
          await navigator.clipboard.writeText(result.optimizedResume);
          alert('PDF formatting unavailable for this layout. Text copied to clipboard.');
          return;
        }
        const { downloadResumePDF } = await import('@/lib/download');
        downloadResumePDF(result.optimizedResume, uploadedFileName || name);
      } else {
        const { downloadCoverLetterDOCX } = await import('@/lib/download');
        await downloadCoverLetterDOCX(result.coverLetter, name);
      }
    } catch {
      setError('Download failed. Try copying instead.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* Nav */}
      <nav style={{
        border: '1px solid transparent',
        backgroundImage: 'linear-gradient(rgba(10,10,10,0.92), rgba(10,10,10,0.92)), linear-gradient(90deg, transparent 0%, rgba(212,168,83,0.25) 50%, transparent 100%)',
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        padding: '0 32px', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0,
        backdropFilter: 'blur(16px)', zIndex: 50,
      }}>
        {/* Logo */}
        <span className="font-display" style={{ color: 'var(--accent)', letterSpacing: '-0.03em', fontSize: 24 }}>
          resumeai
        </span>
        {/* Right side */}
        <div className="flex items-center gap-4">
          {isLoaded && !user ? (
            <>
              <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                Free to start
              </span>
              <SignInButton mode="modal">
                <button className="font-mono text-xs" style={{
                  padding: '7px 16px', borderRadius: 6,
                  border: '1px solid var(--accent)',
                  background: 'var(--accent-dim)',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}>
                  sign in
                </button>
              </SignInButton>
            </>
          ) : isLoaded && user ? (
            <>
              {/* Usage pill */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 12px', borderRadius: 20,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: usageRemaining > 0 ? 'var(--green)' : 'var(--red)',
                  boxShadow: usageRemaining > 0 ? '0 0 6px rgba(74,222,128,0.6)' : '0 0 6px rgba(248,113,113,0.6)',
                }} />
                <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {usageRemaining} free {usageRemaining === 1 ? 'optimization' : 'optimizations'}
                </span>
              </div>

              {/* Upgrade button */}
              <button className="font-mono text-xs" style={{
                padding: '6px 14px', borderRadius: 6,
                border: '1px solid rgba(212,168,83,0.4)',
                background: 'var(--accent-dim)',
                color: 'var(--accent)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                letterSpacing: '0.02em',
              }}
                onClick={() => alert('Paid plans coming soon! 🚀')}
              >
                upgrade ✦
              </button>

              <Link href="/history" className="font-mono text-xs"
                style={{ color: 'var(--text-muted)', textDecoration: 'none', padding: '6px 10px', borderRadius: 6, border: '1px solid transparent', transition: 'all 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
              >
                history
              </Link>
              <UserButton />
            </>
          ) : null}
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '80px 24px 64px', maxWidth: 760, margin: '0 auto' }}>
        <span className="font-mono text-xs" style={{ color: 'var(--accent)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>AI Resume Optimizer</span>
        <h1 className="font-display" style={{ fontSize: 'clamp(36px, 6vw, 64px)', lineHeight: 1.1, letterSpacing: '-0.03em', margin: '16px 0 20px', color: 'var(--text-primary)' }}>
          Land more interviews.<br /><em style={{ color: 'var(--accent)' }}>Automatically.</em>
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--text-secondary)', maxWidth: 520, fontWeight: 300 }}>
          Paste your resume and a job description. Our AI rewrites your bullets, scores your ATS match, and gives you an interview prep plan — in seconds.
        </p>
        <div style={{ display: 'flex', gap: 48, marginTop: 32 }}>
          {[{ n: '3×', label: 'more interviews' }, { n: '<30s', label: 'to optimize' }, { n: 'Free', label: 'to start' }].map(s => (
            <div key={s.label} style={{ minWidth: 80 }}>
              <div className="font-mono" style={{ fontSize: 22, color: 'var(--text-primary)', fontWeight: 500 }}>{s.n}</div>
              <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '0 24px 80px', maxWidth: 760, margin: '0 auto' }}>
        <div className="flex items-center gap-4 mb-10">
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span className="font-mono text-xs" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>how it works</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {[
            { n: '01', title: 'Upload your resume', desc: 'Paste your resume text or drop a PDF. We extract the content and preserve your structure.', icon: '↑' },
            { n: '02', title: 'Paste the job description', desc: 'Copy the full JD from any job board — LinkedIn, Naukri, Wellfound, company sites.', icon: '⎘' },
            { n: '03', title: 'Get your optimized resume', desc: 'AI rewrites your bullets, scores your ATS match, generates a cover letter, and preps you for the interview.', icon: '✦' },
          ].map(step => (
            <div key={step.n} style={{ padding: 24, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{step.n}</span>
                <span style={{ fontSize: 18, color: 'var(--accent)' }}>{step.icon}</span>
              </div>
              <p className="font-mono" style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{step.title}</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Inputs */}
      <section style={{ padding: '0 24px 80px', maxWidth: 760, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}>
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
              <FileText size={14} style={{ color: 'var(--accent)' }} /> your resume
            </label>
            {!uploadedFileName && (
              <div {...getRootProps()} style={{ padding: '6px 12px', border: '1px dashed var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: isDragActive ? 'var(--accent)' : 'var(--text-muted)', borderColor: isDragActive ? 'var(--accent)' : 'var(--border)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6 }}>
                <input {...getInputProps()} />
                <Upload size={11} />
                {isDragActive ? 'Drop it here' : 'Upload PDF or .txt'}
              </div>
            )}
          </div>

          {pdfQualityWarning && (
            <div style={{ marginBottom: 12, padding: '16px 20px', borderRadius: 10, background: 'rgba(212,168,83,0.06)', border: '1px solid rgba(212,168,83,0.3)' }}>
              <p className="font-mono text-xs mb-1" style={{ color: 'var(--accent)' }}>⚠ pdf layout warning</p>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                We couldn't detect a clean structure in your PDF. You'll get a <strong style={{ color: 'var(--text-primary)' }}>text output</strong> instead of a formatted PDF download.
              </p>
              <div className="flex gap-3">
                <button onClick={() => { setResumeText(pendingRawText); setPdfQualityWarning(false); setUploadedFileName('resume.pdf'); }}
                  style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#0a0a0a', fontFamily: 'DM Mono', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                  Continue anyway
                </button>
                <button onClick={() => { setPdfQualityWarning(false); setPendingRawText(''); setResumeText(''); setUploadedFileName(''); }}
                  style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontFamily: 'DM Mono', fontSize: 12, cursor: 'pointer' }}>
                  Cancel — paste text instead
                </button>
              </div>
            </div>
          )}

          {uploadedFileName && !pdfQualityWarning ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--accent-dim)', border: '1px solid rgba(212,168,83,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={16} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <p className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{uploadedFileName}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {resumeText.split(/\s+/).filter(Boolean).length} words extracted
                    {pdfIsStructured
                      ? <span style={{ color: 'var(--green)', marginLeft: 8 }}>✓ structure detected</span>
                      : <span style={{ color: 'var(--accent)', marginLeft: 8 }}>⚠ text only mode</span>}
                  </p>
                </div>
              </div>
              <button onClick={() => { setUploadedFileName(''); setResumeText(''); setPdfIsStructured(true); }}
                style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'DM Mono' }}>
                ✕ Remove
              </button>
            </div>
          ) : !pdfQualityWarning ? (
            <div {...getRootProps()} style={{ border: '1px dashed var(--border)', borderRadius: 8, cursor: 'text', borderColor: isDragActive ? 'var(--accent)' : 'var(--border)', transition: 'all 0.2s' }}>
              <input {...getInputProps()} />
              <textarea rows={12}
                placeholder={"Paste your resume text here, or drop a PDF above...\n\nInclude your work experience, education, skills, and any other relevant sections."}
                value={resumeText} onChange={e => setResumeText(e.target.value)} onClick={e => e.stopPropagation()} />
            </div>
          ) : null}
        </div>
        <div style={{ marginBottom: 24 }}>
          <label className="flex items-center gap-2 text-sm font-mono mb-3" style={{ color: 'var(--text-secondary)' }}>
            <Briefcase size={14} style={{ color: 'var(--accent)' }} /> job description
          </label>
          <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Paste Naukri / Wellfound / internshala / Indeed job URL to auto-fill..."
              value={linkedinUrl}
              onChange={e => setLinkedinUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLinkedinScrape()}
              style={{
                flex: 1, padding: '10px 14px',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text-primary)',
                fontFamily: 'DM Mono', fontSize: 12, outline: 'none',
              }}
            />
            <button
              onClick={handleLinkedinScrape}
              disabled={linkedinLoading || !linkedinUrl.trim()}
              className="font-mono text-xs"
              style={{
                padding: '10px 16px', borderRadius: 8,
                cursor: linkedinLoading || !linkedinUrl.trim() ? 'not-allowed' : 'pointer',
                border: '1px solid var(--border)', background: 'var(--surface-2)',
                color: linkedinLoading || !linkedinUrl.trim() ? 'var(--text-muted)' : 'var(--text-secondary)',
                whiteSpace: 'nowrap', transition: 'all 0.2s',
              }}>
              {linkedinLoading ? '...' : '↓ fetch JD'}
            </button>
          </div>
          {linkedinError && (
            <p className="font-mono text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              ⚠ {linkedinError}
            </p>
          )}
          <textarea rows={10}
            placeholder={"Paste the full job description here...\n\nInclude the role requirements, responsibilities, and any listed skills or qualifications."}
            value={jobDescription}
            onChange={e => {
              setJobDescription(e.target.value);
              // Reset regen count if JD changes after an optimization
              if (result) setRegenCount(0);
            }}
            readOnly={!!result && regenCount > 0 && !isAdminUser}
            style={{ opacity: !!result && regenCount > 0 && !isAdminUser ? 0.6 : 1 }}
          />
          {jobDescription.trim() && (() => {
            const words = jobDescription.trim().split(/\s+/).length;
            const isShort = words < 80;
            const isGood = words >= 80 && words < 250;
            const isDetailed = words >= 250;
            return (
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <div style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: isShort ? 'var(--red)' : isGood ? 'var(--accent)' : 'var(--green)',
                  }} />
                  <span className="font-mono text-xs" style={{
                    color: isShort ? 'var(--red)' : isGood ? 'var(--accent)' : 'var(--green)',
                  }}>
                    {isShort && '⚠ Too short — paste the full JD for best results'}
                    {isGood && '✓ Good length'}
                    {isDetailed && '✓ Detailed JD — great for optimization'}
                  </span>
                </div>
                <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                  {words} words
                </span>
              </div>
            );
          })()}
        </div>

        {error && (
          <div className="flex items-start gap-3 mb-4 rounded-lg p-4" style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <AlertCircle size={16} style={{ color: 'var(--red)', marginTop: 1, flexShrink: 0 }} />
            <p className="text-sm" style={{ color: 'var(--red)' }}>{error}</p>
          </div>
        )}

        <button onClick={handleGenerate} disabled={loading || (!user && isLoaded)}
          className="w-full flex items-center justify-center gap-3 font-mono text-sm transition-all"
          style={{ padding: '16px 24px', borderRadius: 10, minHeight: 56, background: loading ? 'var(--surface-2)' : !user && isLoaded ? 'var(--surface-2)' : usageRemaining <= 0 ? 'var(--surface)' : 'var(--accent)', color: !user && isLoaded ? 'var(--text-muted)' : usageRemaining <= 0 ? 'var(--text-muted)' : loading ? 'var(--text-secondary)' : '#0a0a0a', border: loading ? '1px solid var(--border)' : 'none', cursor: loading || usageRemaining <= 0 || (!user && isLoaded) ? 'not-allowed' : 'pointer', fontWeight: 500, letterSpacing: '0.02em' }}>
          {loading ? <LoadingProgress /> : !user && isLoaded ? (
            <><Sparkles size={16} />Sign in to Get Started<ArrowRight size={16} /></>
          ) : usageRemaining <= 0 ? <>Upgrade for more optimizations</> : (
            <><Sparkles size={16} />Generate Full Optimization<ArrowRight size={16} /></>
          )}
        </button>
        {!loading && usageRemaining > 0 && (
          <p className="text-center text-xs mt-3 font-mono" style={{ color: 'var(--text-muted)' }}>
            {usageRemaining} of {FREE_LIMIT} free optimization{usageRemaining !== 1 ? 's' : ''} remaining
          </p>
        )}
      </section>

      {/* Results */}
      {result && (
        <section ref={resultsRef} style={{ padding: '0 24px 40px', maxWidth: 760, margin: '0 auto' }}>
          <div className="flex items-center gap-4 mb-8">
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span className="font-mono text-xs" style={{ color: 'var(--accent)' }}>results</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {result.modelUsed && (
            <p className="font-mono text-xs mb-4" style={{ color: 'var(--text-muted)', textAlign: 'right' }}>
              generated with {result.modelUsed}
            </p>
          )}

          {prevResult && lastRegenModifier && (
            <div style={{
              padding: '16px 20px', borderRadius: 10, marginBottom: 16,
              background: 'rgba(74,222,128,0.04)',
              border: '1px solid rgba(74,222,128,0.2)',
            }}>
              <p className="font-mono text-xs mb-3" style={{ color: 'var(--green)' }}>
                ↺ regenerated with: {lastRegenModifier}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <p className="font-mono text-xs mb-2" style={{ color: 'var(--text-muted)' }}>score change</p>
                  <p className="font-mono text-sm" style={{ color: 'var(--green)' }}>
                    {prevResult.atsScoreAfter} → {result.atsScoreAfter}
                    <span style={{ fontSize: 10, marginLeft: 6, color: result.atsScoreAfter >= prevResult.atsScoreAfter ? 'var(--green)' : 'var(--red)' }}>
                      ({result.atsScoreAfter >= prevResult.atsScoreAfter ? '+' : ''}{result.atsScoreAfter - prevResult.atsScoreAfter} pts)
                    </span>
                  </p>
                </div>
                <div>
                  <p className="font-mono text-xs mb-2" style={{ color: 'var(--text-muted)' }}>what changed this round</p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {result.improvements.slice(0, 3).map((imp, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs mb-1.5"
                        style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        <span style={{ color: 'var(--green)', flexShrink: 0 }}>✓</span>
                        {imp.split('→')[0]?.trim() || imp}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          {/* Section toggle */}
          <div className="flex gap-1 mb-6" style={{ background: 'var(--surface)', padding: 4, borderRadius: 8, border: '1px solid var(--border)', width: 'fit-content' }}>
            {([
              { id: 'analysis', label: 'analysis', icon: <TrendingUp size={11} /> },
              { id: 'prep', label: 'interview prep', icon: <BookOpen size={11} /> },
            ] as const).map(s => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className="flex items-center gap-1.5 font-mono text-xs transition-all"
                style={{ padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: activeSection === s.id ? 'var(--surface-2)' : 'transparent', color: activeSection === s.id ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {s.icon}{s.label}
              </button>
            ))}
          </div>

          {activeSection === 'analysis' && (
            <>
              <div style={{ padding: 24, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: 16 }}>
                <p className="font-mono text-xs mb-6" style={{ color: 'var(--text-muted)' }}>ats score comparison</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24 }}>
                  <ScoreRing score={result.atsScoreBefore} label="before" />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                      <span className="font-mono" style={{ fontSize: 10, color: result.atsScoreAfter > result.atsScoreBefore ? 'var(--green)' : 'var(--text-muted)' }}>
                        +{result.atsScoreAfter - result.atsScoreBefore} pts
                      </span>
                      <ArrowRight size={12} style={{ color: 'var(--text-muted)' }} />
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    </div>
                  </div>
                  <ScoreRing score={result.atsScoreAfter} label="after" />
                </div>
                {result.scoreBreakdown && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <ScoreBar label="keyword match" before={result.scoreBreakdown.before.keywordMatch} after={result.scoreBreakdown.after.keywordMatch} />
                    <ScoreBar label="experience fit" before={result.scoreBreakdown.before.experienceRelevance} after={result.scoreBreakdown.after.experienceRelevance} />
                    <ScoreBar label="skills alignment" before={result.scoreBreakdown.before.skillsAlignment} after={result.scoreBreakdown.after.skillsAlignment} />
                    <ScoreBar label="formatting" before={result.scoreBreakdown.before.formatting} after={result.scoreBreakdown.after.formatting} />
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div style={{ padding: 24, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <p className="font-mono text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                    <TrendingUp size={10} style={{ display: 'inline', marginRight: 4 }} />what changed
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {result.improvements.map((imp, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs mb-2.5" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        <span style={{ color: 'var(--green)', marginTop: 1, flexShrink: 0 }}>✓</span>{imp}
                      </li>
                    ))}
                  </ul>
                </div>
                {result.weakBullets?.length > 0 && (
                  <div style={{ padding: 24, borderRadius: 12, background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.2)' }}>
                    <p className="font-mono text-xs mb-1" style={{ color: 'var(--red)' }}>
                      <AlertTriangle size={10} style={{ display: 'inline', marginRight: 4 }} />still needs work
                    </p>
                    <p className="text-xs mb-3" style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>Add real metrics or outcomes to strengthen these.</p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {result.weakBullets.map((b, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs mb-2" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          <span style={{ color: 'var(--red)', flexShrink: 0, marginTop: 1 }}>✗</span>{b}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {result.missingKeywords.length > 0 && (
                <div style={{ padding: '16px 20px', borderRadius: 10, marginBottom: 16, background: 'var(--accent-dim)', border: '1px solid rgba(212,168,83,0.2)' }}>
                  <p className="font-mono text-xs mb-3" style={{ color: 'var(--accent)' }}>missing keywords</p>
                  <div className="flex flex-wrap gap-2">
                    {result.missingKeywords.map(kw => (
                      <span key={kw} className="font-mono text-xs px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(212,168,83,0.12)', color: 'var(--accent)', border: '1px solid rgba(212,168,83,0.25)' }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeSection === 'prep' && result.interviewPrep && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
              {result.interviewPrep.skillGaps?.length > 0 && (
                <div style={{ padding: 24, borderRadius: 12, background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.2)' }}>
                  <p className="font-mono text-xs mb-4" style={{ color: 'var(--red)' }}>
                    <Target size={10} style={{ display: 'inline', marginRight: 4 }} />skill gaps
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {result.interviewPrep.skillGaps.map((gap, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs mb-2.5" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        <span style={{ color: 'var(--red)', flexShrink: 0, marginTop: 1 }}>✗</span>{gap}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.interviewPrep.topicsToStudy?.length > 0 && (
                <div style={{ padding: 24, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <p className="font-mono text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                    <BookOpen size={10} style={{ display: 'inline', marginRight: 4 }} />topics to study
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {result.interviewPrep.topicsToStudy.map((topic, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs mb-2.5" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }}>→</span>{topic}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.interviewPrep.likelyQuestions?.length > 0 && (
                <div style={{ padding: 24, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <p className="font-mono text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                    <MessageSquare size={10} style={{ display: 'inline', marginRight: 4 }} />likely interview questions
                  </p>
                  <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {result.interviewPrep.likelyQuestions.map((q, i) => (
                      <li key={i} className="flex items-start gap-3 text-xs mb-3" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        <span className="font-mono" style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 1 }}>{String(i + 1).padStart(2, '0')}</span>{q}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Output tabs */}
          <div className="flex gap-1 mb-4" style={{ background: 'var(--surface)', padding: 4, borderRadius: 8, border: '1px solid var(--border)', width: 'fit-content' }}>
            {(['resume', 'cover'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className="font-mono text-xs transition-all"
                style={{ padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', background: activeTab === tab ? 'var(--surface-2)' : 'transparent', color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {tab === 'resume' ? 'optimized resume' : 'cover letter'}
              </button>
            ))}
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 40 }}>
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                {activeTab === 'resume' ? (pdfIsStructured ? 'resume.pdf' : 'resume.txt') : 'cover_letter.docx'}
              </span>
              <div className="flex items-center gap-2">
                <CopyButton text={activeTab === 'resume' ? result.optimizedResume : result.coverLetter} />
                <button onClick={handleDownload} disabled={downloading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all"
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(212,168,83,0.3)', cursor: downloading ? 'wait' : 'pointer', opacity: downloading ? 0.7 : 1 }}>
                  {downloading ? '...' : `↓ ${activeTab === 'resume' ? (pdfIsStructured ? 'Download PDF' : 'Copy Text') : 'Download DOCX'}`}
                </button>
              </div>
            </div>
            <pre style={{ padding: 24, margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, lineHeight: 1.75, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 520, overflowY: 'auto', fontWeight: 300 }}>
              {activeTab === 'resume' ? result.optimizedResume : result.coverLetter}
            </pre>
          </div>
        </section>
      )}

      {/* Regenerate */}
      {result && (
        <section style={{ padding: '0 24px 100px', maxWidth: 760, margin: '0 auto' }}>
          <div style={{ padding: 24, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="font-mono text-xs mb-4" style={{ color: 'var(--text-muted)' }}>↺ regenerate with different focus</p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {REGEN_OPTIONS.map(opt => (
                <button key={opt.value}
                  onClick={() => {
                    setRegenModifier(opt.value);
                    setShowRegenCustom(opt.value === 'custom');
                  }}
                  className="font-mono text-xs transition-all"
                  style={{
                    padding: '8px 14px', borderRadius: 6, cursor: 'pointer',
                    border: regenModifier === opt.value ? '1px solid var(--accent)' : '1px solid var(--border)',
                    background: regenModifier === opt.value ? 'var(--accent-dim)' : 'transparent',
                    color: regenModifier === opt.value ? 'var(--accent)' : 'var(--text-muted)',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>

            {showRegenCustom && (
              <textarea
                rows={3}
                placeholder="Describe exactly how you want the resume rewritten... e.g. 'Focus on AI and machine learning keywords, make it sound like a research engineer'"
                value={regenCustom}
                onChange={e => setRegenCustom(e.target.value)}
                style={{ marginBottom: 16 }}
              />
            )}

            <button
              onClick={handleRegenerate}
              disabled={regenLoading || !regenModifier}
              className="w-full flex items-center justify-center gap-3 font-mono text-sm transition-all"
              style={{
                padding: '14px 24px', borderRadius: 10, minHeight: 52,
                background: regenLoading ? 'var(--surface-2)' : 'var(--surface-2)',
                color: !regenModifier ? 'var(--text-muted)' : 'var(--text-primary)',
                border: regenLoading ? '1px solid var(--accent)' : '1px solid var(--border)',
                cursor: regenLoading || !regenModifier ? 'not-allowed' : 'pointer',
                fontWeight: 500,
                transition: 'all 0.3s',
              }}>
              {regenLoading ? <LoadingProgress /> : <>↺ Regenerate with this focus</>}
            </button>
            <p className="text-center font-mono text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
              {isAdminUser
                ? 'Unlimited regenerations'
                : regenCount >= MAX_REGENS
                ? '✗ Regeneration used — generate a new optimization to reset'
                : `${MAX_REGENS - regenCount} regeneration remaining`}
            </p>
          </div>
        </section>
      )}

      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px', textAlign: 'center' }}>
        <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>resumeai — built for job seekers</p>
      </footer>
    </div>
  );
}