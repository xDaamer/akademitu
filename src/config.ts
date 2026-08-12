import { Teacher } from './types';

// =========================================================================
// HOCALAR GÖRSEL AKIŞ HIZI VE SİTE AYARLARI
// =========================================================================

/**
 * HOCALAR GÖRSEL AKIŞ HIZI (Saniye Cinsinden)
 * -------------------------------------------------------------------------
 * Bu değeri küçültürseniz görseller daha hızlı akar (örn: 10 veya 12).
 * Bu değeri büyütürseniz görseller daha yavaş akar (örn: 25 veya 30).
 * Kaynak koddan burayı değiştirerek dilediğiniz akış hızını ayarlayabilirsiniz.
 */
export const TEACHER_SCROLL_SPEED_SECONDS = 18;

/**
 * ÖZEL DERS & KOÇLUK KAMPANYASI BİTİŞ TARİHİ
 * -------------------------------------------------------------------------
 * Eylül ayının 2. haftası sonu (13 Eylül 2026 23:59:59).
 */
export const CAMPAIGN_DEADLINE = new Date('2026-09-13T23:59:59');

/**
 * MARKA RENK PALETİ
 */
export const BRAND_COLORS = {
  NAVY: '#191F61',
  MINT: '#B6D6CC',
  GOLD: '#c5a059',
  NAVY_DARK: '#101442',
  MINT_LIGHT: '#EBF5F2',
};

/**
 * VARSAYILAN DERECE ÖĞRENCİLERİ (KOÇLARIMIZ) LİSTESİ
 * -------------------------------------------------------------------------
 * NOT: 'teachers' klasörüne yüklediğiniz her yeni fotoğraf otomatik olarak
 * bu akışa dahil edilir! Fotoğraf yüklenmediyse aşağıdaki varsayılan
 * derece öğrencileri görselleri görüntülenir.
 */
export const DEFAULT_TEACHERS: Teacher[] = [
  {
    id: '1',
    name: 'Mert Yılmaz',
    department: 'İTÜ Bilgisayar Mühendisliği',
    rank: 'YKS Sayısal 42.si',
    branch: 'Matematik & Fizik',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=500',
  },
  {
    id: '2',
    name: 'Zeynep Kaya',
    department: 'İTÜ Endüstri Mühendisliği',
    rank: 'YKS Sayısal 118.si',
    branch: 'Geometri & Kimya',
    imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=500',
  },
  {
    id: '3',
    name: 'Arda Demir',
    department: 'İTÜ Yapay Zeka Mühendisliği',
    rank: 'YKS Sayısal 89.su',
    branch: 'Matematik & Biyoloji',
    imageUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=500',
  },
  {
    id: '4',
    name: 'Elif Şahin',
    department: 'İTÜ Elektrik-Elektronik Müh.',
    rank: 'YKS Sayısal 154.sü',
    branch: 'Fizik & Kimya',
    imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=500',
  },
  {
    id: '5',
    name: 'Kaan Çelik',
    department: 'İTÜ Makina Mühendisliği',
    rank: 'LGS Türkiye 1.si & YKS 204.sü',
    branch: 'Matematik & LGS Koçluğu',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=500',
  },
];
