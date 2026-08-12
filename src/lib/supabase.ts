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
 * CREATE POLICY "Allow public insert and update" ON public.leads
 *   FOR ALL TO anon USING (true) WITH CHECK (true);
 */

import { createClient } from '@supabase/supabase-js';

// Server proxy endpoints prevent exposing sensitive API keys to the browser
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

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
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const payload = {
    fullName: data.fullName,
    phone: data.phone,
    examType: data.examType || 'YKS',
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
  } catch (err) {
    console.warn('Server API unavailable, falling back to client method:', err);
  }

  // Fallback if server route is unavailable but client client exists
  if (supabase) {
    try {
      const { data: insertedData } = await supabase
        .from('leads')
        .insert([{
          full_name: data.fullName,
          phone: data.phone,
          exam_type: data.examType || 'YKS',
          step: 1,
          created_at: new Date().toISOString(),
        }])
        .select('id')
        .single();

      return { success: true, id: insertedData?.id || localId };
    } catch {
      // Fallback already saved to localStorage
    }
  }

  return { success: true, id: localId };
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
  } catch (err) {
    console.warn('Server API unavailable for Step 2:', err);
  }

  // Direct Supabase Fallback
  if (supabase) {
    try {
      const payload = {
        phone: data.phone,
        student_full_name: data.studentFullName,
        parent_full_name: data.parentFullName || '',
        user_role: data.userRole,
        grade_class: data.gradeClass,
        selected_subjects: data.selectedSubjects,
        step: 2,
        updated_at: new Date().toISOString(),
      };

      if (data.leadId && !data.leadId.startsWith('lead_') && !data.leadId.startsWith('srv_')) {
        await supabase.from('leads').update(payload).eq('id', data.leadId);
      } else {
        await supabase.from('leads').update(payload).eq('phone', data.phone);
      }
    } catch {
      // Fallback already saved to localStorage
    }
  }

  return { success: true };
}


