'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { FileText, ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';

interface Optimization {
  id: string;
  job_title: string;
  company_name: string;
  ats_score_before: number;
  ats_score_after: number;
  optimized_resume: string;
  cover_letter: string;
  missing_keywords: string[];
  improvements: string[];
  weak_bullets: string[];
  score_breakdown: {
    before: { keywordMatch: number; experienceRelevance: number; skillsAlignment: number; formatting: number; };
    after: { keywordMatch: number; experienceRelevance: number; skillsAlignment: number; formatting: number; };
  };
  interview_prep: {
    topicsToStudy: string[];
    likelyQuestions: string[];
    skillGaps: string[];
  };
  model_used?: string;
  created_at: string;
}

export default function HistoryPage() {
  const { user, isLoaded } = useUser();
  const [optimizations, setOptimizations] = useState<Optimization[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !user) return;
    fetch('/api/history')
      .then(r => r.json())
      .then(d => setOptimizations(d.optimizations ?? []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [user, isLoaded]);

  const handleReopen = (opt: Optimization) => {
    localStorage.setItem('rz_reopen', JSON.stringify({
      optimizedResume: opt.optimized_resume,
      coverLetter: opt.cover_letter,
      atsScoreBefore: opt.ats_score_before,
      atsScoreAfter: opt.ats_score_after,
      missingKeywords: opt.missing_keywords ?? [],
      improvements: opt.improvements ?? [],
      weakBullets: opt.weak_bullets ?? [],
      scoreBreakdown: opt.score_breakdown ?? {
        before: { keywordMatch: 0, experienceRelevance: 0, skillsAlignment: 0, formatting: 0 },
        after: { keywordMatch: 0, experienceRelevance: 0, skillsAlignment: 0, formatting: 0 },
      },
      interviewPrep: opt.interview_prep ?? { topicsToStudy: [], likelyQuestions: [], skillGaps: [] },
      modelUsed: opt.model_used ?? '',
      usageCount: 0,
      usageRemaining: 2,
    }));
    router.push('/');
  };

  const handleDownloadResume = async (opt: Optimization) => {
    const { downloadResumePDF } = await import('@/lib/download');
    downloadResumePDF(opt.optimized_resume, `${opt.company_name}_resume`);
  };

  const handleDownloadCover = async (opt: Optimization) => {
    const { downloadCoverLetterDOCX } = await import('@/lib/download');
    const nameMatch = opt.optimized_resume.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)/m);
    const name = nameMatch?.[1] ?? 'Candidate';
    await downloadCoverLetterDOCX(opt.cover_letter, name);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this optimization?')) return;
    const res = await fetch(`/api/history?id=${id}`, { method: 'DELETE' });
    if (res.ok) setOptimizations(prev => prev.filter(o => o.id !== id));
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <nav style={{
        borderBottom: '1px solid var(--border)', padding: '0 24px', height: '56px',
        display: 'flex', alignItems: 'center', gap: 16,
        background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', textDecoration: 'none', fontSize: 13 }}>
          <ArrowLeft size={14} /> back
        </Link>
        <span className="font-display" style={{ color: 'var(--accent)', fontSize: 18 }}>resumeai</span>
      </nav>

      <section style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>
        <h1 className="font-display" style={{ fontSize: 32, color: 'var(--text-primary)', marginBottom: 8 }}>
          Your optimizations
        </h1>
        <p className="font-mono text-xs" style={{ color: 'var(--text-muted)', marginBottom: 12 }}>
          {optimizations.length} total
        </p>
        <p className="font-mono text-xs mb-10" style={{ color: 'var(--text-muted)' }}>
          Click any card to reopen the full results
        </p>

        {loading && (
          <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>Loading...</p>
        )}

        {!loading && optimizations.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 12 }}>
            <p className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>No optimizations yet</p>
            <Link href="/" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'DM Mono', marginTop: 12, display: 'block' }}>
              Create your first one →
            </Link>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {optimizations.map(opt => (
            <div key={opt.id}
              onClick={() => handleReopen(opt)}
              style={{
                padding: 20, borderRadius: 12,
                background: 'var(--surface)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                cursor: 'pointer',
                transition: 'border-color 0.2s, background 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(212,168,83,0.4)';
                e.currentTarget.style.background = 'var(--surface-2)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.background = 'var(--surface)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 8,
                  background: 'var(--accent-dim)', border: '1px solid rgba(212,168,83,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <FileText size={18} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <p className="font-mono text-sm" style={{ color: 'var(--text-primary)', marginBottom: 4 }}>
                    {opt.job_title}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {opt.company_name} · {new Date(opt.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <p className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>ats</p>
                  <p className="font-mono" style={{ fontSize: 13, color: 'var(--green)' }}>
                    {opt.ats_score_before} → {opt.ats_score_after}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={(e) => { e.stopPropagation(); handleDownloadResume(opt); }}
                    style={{
                      padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)',
                      background: 'var(--surface-2)', color: 'var(--text-secondary)',
                      fontSize: 11, fontFamily: 'DM Mono', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                    <Download size={11} /> PDF
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDownloadCover(opt); }}
                    style={{
                      padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)',
                      background: 'var(--surface-2)', color: 'var(--text-secondary)',
                      fontSize: 11, fontFamily: 'DM Mono', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                    <Download size={11} /> DOCX
                  </button>
                  <button onClick={async (e) => { e.stopPropagation(); await handleDelete(opt.id); }}
                    style={{
                      padding: '6px 12px', borderRadius: 6,
                      border: '1px solid rgba(248,113,113,0.3)',
                      background: 'transparent', color: 'var(--red)',
                      fontSize: 11, fontFamily: 'DM Mono', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                    ✕ Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}