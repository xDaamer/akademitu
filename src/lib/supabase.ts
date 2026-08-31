/**
 * Supabase integration with localStorage fail-safe fallback.
 * 
 * If you haven't created the 'leads' table in Supabase yet, run this SQL in your Supabase SQL Editor:
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
 *   step INT DEFAULT 1
 * );
 * 
 * ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
 * Do not add public INSERT or UPDATE policies: lead writes must only use the server's service-role key.
 *
 * The `testimonials` table is read the same way: the browser never talks to Supabase
 * directly (there is no client-side Supabase client in this app at all). Reads go through
 * GET /api/testimonials in server.ts, which uses the service-role key. The `anon` and
 * `authenticated` roles have zero grants on both `leads` and `testimonials` — see
 * supabase-security-lockdown.sql, which must be run against the live project.
 */

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
 * Step 1: Save initial lead contact info via secure Server API
 */
export async function saveLeadStep1(data: {
  fullName: string;
  phone: string;
  examType?: string;
  turnstileToken: string;
  website: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const payload = {
    fullName: data.fullName,
    phone: data.phone,
    examType: data.examType || 'YKS',
    turnstileToken: data.turnstileToken,
    website: data.website,
  };

  // Always back up locally first
  const localId = saveLocalLead({
    full_name: data.fullName,
    phone: data.phone,
    exam_type: data.examType || 'YKS',
    step: 1,
    created_at: new Date().toISOString(),
  });

  try {
    // Send via Server-Side Proxy Route to keep API keys hidden from client
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const resData = await res.json();
      return { success: true, id: resData?.id || localId };
    }
    const resData = await res.json().catch(() => null);
    return { success: false, error: resData?.error || 'Form gönderilemedi. Lütfen tekrar deneyin.' };
  } catch (err) {
    console.warn('Server API unavailable:', err);
  }
  return { success: false, error: 'Sunucuya ulaşılamadı. Lütfen tekrar deneyin.' };
}

/**
 * Step 2: Update lead with detailed student and grade information via secure Server API
 */
export async function updateLeadStep2(data: {
  leadId?: string;
  phone: string;
  studentFullName: string;
  parentFullName?: string;
  userRole: 'Veli' | 'Öğrenci';
  gradeClass: string;
  selectedSubjects: string[];
  website: string;
}): Promise<{ success: boolean; error?: string }> {
  // Always back up locally
  saveLocalLead({
    phone: data.phone,
    student_full_name: data.studentFullName,
    parent_full_name: data.parentFullName || '',
    user_role: data.userRole,
    grade_class: data.gradeClass,
    selected_subjects: data.selectedSubjects,
    step: 2,
    updated_at: new Date().toISOString(),
  });

  try {
    // Send via Server-Side Proxy Route
    const res = await fetch('/api/leads/step2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      return { success: true };
    }
    const resData = await res.json().catch(() => null);
    return { success: false, error: resData?.error || 'Form gönderilemedi. Lütfen tekrar deneyin.' };
  } catch (err) {
    console.warn('Server API unavailable for Step 2:', err);
  }
  return { success: false, error: 'Sunucuya ulaşılamadı. Lütfen tekrar deneyin.' };
}


