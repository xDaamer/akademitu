/**
 * Supabase integration with localStorage fail-safe fallback.
 *
 * Writes go straight from the browser to Supabase using the anon/publishable
 * key (see supabaseClient.ts) — NOT through a server proxy. This is
 * intentional: the Vercel serverless function that used to sit in front of
 * this (server.ts, via api/[...path].ts) throws FUNCTION_INVOCATION_FAILED
 * on every invocation in production and the root cause couldn't be diagnosed
 * without access to Vercel's function logs. See supabase-anon-lead-insert.sql
 * for the RLS policies that make this safe: anon can only INSERT/UPDATE
 * `leads` (never SELECT/DELETE — no way to read back or enumerate rows) and
 * only SELECT published `testimonials`.
 *
 * If you haven't run supabase-anon-lead-insert.sql yet, run it in your
 * Supabase project's SQL Editor before this will work. The `leads` table
 * itself:
 *
 * CREATE TABLE public.leads (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW(),
 *   full_name TEXT,
 *   phone TEXT UNIQUE,
 *   exam_type TEXT,
 *   student_full_name TEXT,
 *   parent_full_name TEXT,
 *   user_role TEXT,
 *   grade_class TEXT,
 *   selected_subjects TEXT[],
 *   step INT DEFAULT 1,
 *   website TEXT -- honeypot column, see supabase-anon-lead-insert.sql
 * );
 *
 * The `testimonials` table is read the same way, straight from the browser
 * now too (see TestimonialsSection.tsx) — RLS restricts anon to
 * `is_published = true` rows only.
 */
import { supabase } from './supabaseClient';

// Helper to save backup to LocalStorage so no user data is ever lost
function saveLocalLead(payload: any): string {
  try {
    const localLeads = JSON.parse(localStorage.getItem('derece_leads') || '[]');
    const existingIndex = localLeads.findIndex((l: any) => l.phone === payload.phone || (payload.id && l.id === payload.id));

    if (existingIndex !== -1) {
      localLeads[existingIndex] = { ...localLeads[existingIndex], ...payload };
    } else {
      const tempId = payload.id || 'lead_' + Date.now();
      localLeads.push({ ...payload, id: tempId });
    }

    localStorage.setItem('derece_leads', JSON.stringify(localLeads));
    return payload.id || 'lead_' + Date.now();
  } catch (err) {
    console.error('LocalStorage write error:', err);
    return 'lead_' + Date.now();
  }
}

/**
 * Step 1: Save initial lead contact info, direct to Supabase (anon INSERT).
 */
export async function saveLeadStep1(data: {
  fullName: string;
  phone: string;
  examType?: string;
  website: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  // Always back up locally first
  const localId = saveLocalLead({
    full_name: data.fullName,
    phone: data.phone,
    exam_type: data.examType || 'YKS',
    step: 1,
    created_at: new Date().toISOString(),
  });

  if (!supabase) {
    return { success: false, error: 'Sunucuya ulaşılamadı. Lütfen tekrar deneyin.' };
  }

  try {
    // No .select() after insert: RLS-enabled tables require SELECT privilege
    // to return the inserted row (Postgres's RETURNING-under-RLS rule), and
    // anon intentionally has none — it can never read leads back, only add/
    // update them. We don't need the real id anyway: updateLeadStep2 below
    // keys off `phone` (UNIQUE), so the local fallback id is enough.
    const { error } = await supabase.from('leads').insert({
      full_name: data.fullName,
      phone: data.phone,
      exam_type: data.examType || 'YKS',
      website: data.website,
      step: 1,
    });

    if (error) {
      console.error('[Supabase] Lead Step 1 insert failed:', error.message, error);
      return { success: false, error: error.message || 'Form gönderilemedi. Lütfen tekrar deneyin.' };
    }

    return { success: true, id: localId };
  } catch (err) {
    console.warn('Supabase unavailable:', err);
  }
  return { success: false, error: 'Sunucuya ulaşılamadı. Lütfen tekrar deneyin.' };
}

/**
 * Step 2: Update lead with detailed student and grade information via the
 * update_lead_step2 RPC (a SECURITY DEFINER Postgres function — see
 * supabase-anon-lead-insert.sql). Not a raw table UPDATE: Postgres requires
 * SELECT privilege on any column referenced in an UPDATE's WHERE clause
 * (independent of RLS), and granting that — even scoped to just `phone` —
 * would let anon enumerate every phone number ever submitted. The RPC runs
 * server-side with elevated privileges internally, so anon keeps zero
 * SELECT on `leads`.
 */
export async function updateLeadStep2(data: {
  leadId?: string;
  phone: string;
  fullName?: string;
  examType?: string;
  studentFullName: string;
  parentFullName?: string;
  userRole: 'Veli' | 'Öğrenci';
  gradeClass: string;
  selectedSubjects: string[];
  website: string;
}): Promise<{ success: boolean; error?: string }> {
  // Always back up locally. fullName/examType are included so the local
  // backup stays complete even if step 1's insert never landed.
  saveLocalLead({
    phone: data.phone,
    full_name: data.fullName || '',
    exam_type: data.examType || 'YKS',
    student_full_name: data.studentFullName,
    parent_full_name: data.parentFullName || '',
    user_role: data.userRole,
    grade_class: data.gradeClass,
    selected_subjects: data.selectedSubjects,
    step: 2,
    updated_at: new Date().toISOString(),
  });

  if (!supabase) {
    return { success: false, error: 'Sunucuya ulaşılamadı. Lütfen tekrar deneyin.' };
  }

  try {
    const { error } = await supabase.rpc('update_lead_step2', {
      p_phone: data.phone,
      p_student_full_name: data.studentFullName,
      p_parent_full_name: data.parentFullName || '',
      p_user_role: data.userRole,
      p_grade_class: data.gradeClass,
      p_selected_subjects: data.selectedSubjects,
      p_website: data.website,
    });

    if (error) {
      console.error('[Supabase] Lead Step 2 update failed:', error.message, error);
      return { success: false, error: error.message || 'Form gönderilemedi. Lütfen tekrar deneyin.' };
    }

    return { success: true };
  } catch (err) {
    console.warn('Supabase unavailable for Step 2:', err);
  }
  return { success: false, error: 'Sunucuya ulaşılamadı. Lütfen tekrar deneyin.' };
}
