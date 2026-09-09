/**
 * LEAD KAYDI — ARTIK KENDİ API KATMANIMIZ ÜZERİNDEN
 * ============================================================================
 * Eskiden bu dosya tarayıcıdan DOĞRUDAN Supabase'e yazıyordu (anon anahtarıyla),
 * çünkü Vercel'deki serverless fonksiyon her istekte çöküyordu. O hata
 * 2026-09-08'de giderildi (ESM modül çözümlemesi, bkz. api/[...path].ts) ve
 * artık istek /api/leads üzerinden gidiyor.
 *
 * Kazanç anahtarın "gizlenmesi" değil — Supabase'in anon anahtarı zaten gizli
 * bir sır değil. Kazanç şu: anon rolünün `leads` üzerindeki INSERT yetkisi
 * tamamen kaldırılabildi (bkz. supabase-portal-auth.sql), yani o anahtarla
 * artık hiçbir şey yapılamıyor. Ayrıca doğrulama ve hız limiti sunucuda,
 * IP başına uygulanabiliyor.
 *
 * localStorage yedeği KORUNDU: ağ koparsa ya da sunucu hata verirse kullanıcının
 * girdiği bilgi yine de bir yerde duruyor.
 */
import { apiFetch, ApiRequestError } from './api';

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
 * Adım 1: ad + telefon. İstek /api/leads'e gider; sunucu doğrulamayı, hız
 * limitini ve Supabase yazımını üstlenir.
 */
export async function saveLeadStep1(data: {
  fullName: string;
  phone: string;
  examType?: string;
  website: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  // Her şeyden önce yerel yedek: ağ koparsa bile bilgi kaybolmasın.
  const localId = saveLocalLead({
    full_name: data.fullName,
    phone: data.phone,
    exam_type: data.examType || 'YKS',
    step: 1,
    created_at: new Date().toISOString(),
  });

  try {
    const result = await apiFetch<{ id?: string }>('/api/leads', {
      method: 'POST',
      body: {
        fullName: data.fullName,
        phone: data.phone,
        examType: data.examType || 'YKS',
        website: data.website,
      },
    });

    /*
     * Sunucu artık gerçek satır id'sini dönebiliyor (servis rolü RLS'e
     * takılmadan .select() yapabiliyor). Adım 2 bu id'yi kullanarak doğru
     * satırı güncelliyor; yoksa yerel yedek id'ye düşülüyor.
     */
    return { success: true, id: result.id || localId };
  } catch (err) {
    const message =
      err instanceof ApiRequestError
        ? err.message
        : 'Sunucuya ulaşılamadı. Lütfen tekrar deneyin.';
    console.error('[API] Lead adım 1 başarısız:', message);
    return { success: false, error: message };
  }
}

/**
 * Adım 2: öğrenci detayları. Sunucu, doğru satırı hedeflemek için
 * update_lead_step2 RPC'sini çağırır (bkz. server.ts'teki açıklama).
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
  // fullName/examType yerel yedeğe de yazılıyor ki adım 1 hiç ulaşmamış olsa
  // bile buradaki kayıt eksiksiz kalsın.
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

  try {
    await apiFetch('/api/leads/step2', {
      method: 'POST',
      body: {
        leadId: data.leadId,
        phone: data.phone,
        fullName: data.fullName,
        examType: data.examType,
        studentFullName: data.studentFullName,
        parentFullName: data.parentFullName || '',
        userRole: data.userRole,
        gradeClass: data.gradeClass,
        selectedSubjects: data.selectedSubjects,
        website: data.website,
      },
    });

    return { success: true };
  } catch (err) {
    const message =
      err instanceof ApiRequestError
        ? err.message
        : 'Sunucuya ulaşılamadı. Lütfen tekrar deneyin.';
    console.error('[API] Lead adım 2 başarısız:', message);
    return { success: false, error: message };
  }
}
