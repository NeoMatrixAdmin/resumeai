import { createClient } from '@supabase/supabase-js';

// This client uses the service role key — only use in API routes, never in browser
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface OptimizationRecord {
  id?: string;
  user_id: string;
  job_title?: string;
  company_name?: string;
  job_description: string;
  original_resume: string;
  optimized_resume: string;
  cover_letter: string;
  ats_score_before: number;
  ats_score_after: number;
  missing_keywords: string[];
  improvements: string[];
  weak_bullets: string[];
  score_breakdown: object;
  interview_prep: object;
  created_at?: string;
}

export async function saveOptimization(data: OptimizationRecord) {
  const { data: result, error } = await supabaseAdmin
    .from('optimizations')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('Supabase save error:', error);
    return null;
  }
  return result;
}

export async function getUserOptimizations(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('optimizations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase fetch error:', error);
    return [];
  }
  return data;
}

export async function deleteOptimization(id: string) {
  const { error } = await supabaseAdmin
    .from('optimizations')
    .delete()
    .eq('id', id);
  return !error;
}