import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { optimizeResume } from '@/lib/gemini';
import { getUsageCount, incrementUsage, FREE_LIMIT } from '@/lib/redis';
import { saveOptimization, supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    console.log('Clerk userId:', userId);
    const { resumeText, jobDescription, fingerprint, modifier } = await req.json();

    if (!resumeText?.trim() || !jobDescription?.trim()) {
      return NextResponse.json(
        { error: 'Resume and job description are required.' },
        { status: 400 }
      );
    }

    const isAdmin = userId === process.env.ADMIN_USER_ID;
    const identifier = userId || fingerprint;

    if (!identifier) {
      return NextResponse.json(
        { error: 'Missing session identifier.' },
        { status: 400 }
      );
    }

    const usageCount = await getUsageCount(identifier);

    if (!isAdmin && usageCount >= FREE_LIMIT) {
      return NextResponse.json(
        { error: 'FREE_LIMIT_REACHED', usageCount },
        { status: 429 }
      );
    }

    const result = await optimizeResume(resumeText, jobDescription, modifier);
    const newCount = isAdmin ? usageCount : await incrementUsage(identifier);

    if (userId) {
      console.log('Attempting to save for userId:', userId);

      await supabaseAdmin
        .from('users')
        .upsert({ id: userId, email: '' }, { onConflict: 'id' });

      const jobTitleMatch =
        jobDescription.match(/role:\s*(.+)/i) ||
        jobDescription.match(/position:\s*(.+)/i) ||
        jobDescription.match(/hiring\s+(?:for\s+)?(.{5,60})/i) ||
        jobDescription.match(/(?:we are|we're)\s+(?:seeking|looking for)\s+(.{5,60})/i) ||
        jobDescription.match(/^(?!.*(?:india|bangalore|mumbai|delhi|remote|hybrid|\d+\s*-\s*\d+\s*years?|0\s*-|1\s*-))(.{10,60})$/im);

      const companyMatch =
        jobDescription.match(/company:\s*(.+)/i) ||
        jobDescription.match(/^([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)\s+is\s+(?:an?|the)/m) ||
        jobDescription.match(/(?:join|at)\s+([A-Z][a-zA-Z]+(?:[\s.][a-zA-Z]+)?)\b/);

      const saveResult = await saveOptimization({
        user_id: userId,
        job_title: jobTitleMatch?.[1]?.trim().slice(0, 100) || 'Unknown Role',
        company_name: companyMatch?.[1]?.trim().slice(0, 100) || 'Unknown Company',
        job_description: jobDescription,
        original_resume: resumeText,
        optimized_resume: result.optimizedResume,
        cover_letter: result.coverLetter,
        ats_score_before: result.atsScoreBefore,
        ats_score_after: result.atsScoreAfter,
        missing_keywords: result.missingKeywords,
        improvements: result.improvements,
        weak_bullets: result.weakBullets,
        score_breakdown: result.scoreBreakdown,
        interview_prep: result.interviewPrep,
      });

      console.log('Save result:', saveResult);
    } else {
      console.log('No userId — not saving. userId was:', userId);
    }

    return NextResponse.json({
      ...result,
      usageCount: newCount,
      usageRemaining: FREE_LIMIT - newCount,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Something went wrong.';
    console.error('Optimize error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}