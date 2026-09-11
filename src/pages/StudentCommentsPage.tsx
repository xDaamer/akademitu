import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MessageSquareQuote } from 'lucide-react';
import { PageMeta } from '../components/PageMeta';
import { apiFetch, ApiRequestError } from '../lib/api';
import { SITE_URL } from '../config';
import need from '../../need.json';
import { routingMode, panelRootPath, COMMENTS_PATH } from '../lib/host';

/*
 * KOÇUN YORUMLARI — öğrencinin ders bazlı geri bildirimleri
 * ===========================================================================
 * Panelin ana ekranındaki "Koçun Notu" bölümünden AYRI bir sayfa ve ikisi
 * farklı şeyler:
 *
 *   coach_notes (panelde)  -> öğrenci hakkında GENEL koç notu, derse bağlı
 *                             değil; panelde en sonuncusu gösteriliyor.
 *   lesson_comments (burası) -> BELİRLİ BİR DERSE ait öğretmen yorumu,
 *                             ders başına tek tane.
 *
 * Ayrı sayfa olmasının sebebi uzunluk: bu liste dönem boyunca büyüyor.
 * Panelin ana ekranına konsaydı "bu hafta ne var" sorusunu bir yorum
 * arşivinin altına gömerdi.
 *
 * Veri /api/portal/yorumlar'dan geliyor; sorgular öğrencinin kendi jetonuyla
 * ve RLS altında çalışıyor (lesson_comments_select_as_student), yani bu sayfa
 * başka bir öğrencinin yorumunu hiçbir durumda gösteremez.
 *
 * XSS NOTU: yorum metni {} içinde basılıyor, dangerouslySetInnerHTML YOK.
 * React metni kaçırıyor, yani yorumun içindeki <script> ekranda düz metin
 * olarak görünür — çalışmaz.
 */

interface Yorum {
  text: string;
  updatedAt: string;
}

interface YorumluDers {
  id: string;
  subject: string;
  teacherName: string | null;
  startsAt: string;
  comment: Yorum | null;
}

/* Panelin geri kalanıyla aynı saat dilimi varsayımı. */
const TZ = 'Europe/Istanbul';

function tarihSaat(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: TZ,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export const StudentCommentsPage: React.FC = () => {
  const [dersler, setDersler] = useState<YorumluDers[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    let iptal = false;

    apiFetch<{ lessons: YorumluDers[] }>('/api/portal/yorumlar')
      .then((veri) => {
        if (!iptal) setDersler(veri.lessons);
      })
      .catch((err) => {
        if (iptal) return;
        setHata(err instanceof ApiRequestError ? err.message : 'Yorumlar alınamadı.');
      })
      .finally(() => {
        if (!iptal) setYukleniyor(false);
      });

    return () => {
      iptal = true;
    };
  }, []);

  const yerel = routingMode() === 'both';

  return (
    <>
      <PageMeta
        title="Koçun Yorumları | akademITU"
        description="Derslerine öğretmenlerinin bıraktığı yorumlar."
        origin={yerel ? SITE_URL : need.portal.domain}
        path={yerel ? `/panel${COMMENTS_PATH}` : COMMENTS_PATH}
        noIndex
      />

      <div className="min-h-dvh bg-slate-50">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex h-20 max-w-3xl items-center gap-3 px-4 sm:px-6">
            {/* Panele dönüş: aynı host içinde olduğu için react-router Link
                yeterli, tam sayfa yüklemesi gerekmiyor. */}
            <Link
              to={panelRootPath()}
              className="flex items-center gap-1.5 rounded text-sm font-bold text-[#191F61] transition-colors hover:text-[#101442] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] focus-visible:ring-offset-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Panele dön
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="mb-8 flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#191F61]/10 text-[#191F61]">
              <MessageSquareQuote className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-[#191F61] sm:text-3xl">
                Koçunun yorumları
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Tamamlanan derslerin ve öğretmenlerinin notları.
              </p>
            </div>
          </div>

          {hata && (
            <p
              role="alert"
              className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700"
            >
              {hata}
            </p>
          )}

          {yukleniyor ? (
            <p className="py-16 text-center text-sm text-slate-500">Yükleniyor...</p>
          ) : dersler.length === 0 ? (
            /* Boş durum ne OLMADIĞINI değil ne OLACAĞINI söylüyor — panelin
               geri kalanındaki boş durumlarla aynı yaklaşım. */
            <p className="rounded-3xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500 shadow-sm">
              Henüz tamamlanmış dersin yok. Dersler tamamlandıkça öğretmenlerinin
              yorumları burada birikecek.
            </p>
          ) : (
            <ul className="space-y-3">
              {dersler.map((ders) => (
                <li
                  key={ders.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-sm font-bold text-[#191F61]">{ders.subject}</span>
                    {ders.teacherName && (
                      <span className="text-sm text-slate-500">· {ders.teacherName}</span>
                    )}
                    <span className="ml-auto text-xs text-slate-400">
                      {tarihSaat(ders.startsAt)}
                    </span>
                  </div>

                  {ders.comment ? (
                    /* whitespace-pre-line: öğretmenin paragraf aralarındaki
                       satır sonları korunsun. Metin yine kaçırılıyor —
                       biçimlendirme değil, yalnızca satır sonu. */
                    <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                      {ders.comment.text}
                    </p>
                  ) : (
                    <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      Bu ders için henüz yorum eklenmedi.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </>
  );
};
