/*
 * PANELLER — HTTP / YETKİLENDİRME TESTLERİ (öğretmen + öğrenci + yönetim)
 * ============================================================================
 * Bu betik ROL KAPISINI ve route'ların döndürdüğü durum kodlarını ölçüyor.
 * RLS tarafı ayrı test ediliyor (supabase-teacher-panel-tests.sql) ve ikisi
 * farklı katmanlar:
 *
 *   bu betik  -> "öğrenci /api/teacher'a gelirse 403 alıyor mu"
 *   SQL testi -> "403 kaldırılsa bile satır gelmiyor mu"
 *
 * İkincisi gerçek güvenlik sınırı; bu betik onun üstündeki kullanılabilirlik
 * katmanını doğruluyor. İkisi birden geçmeden faz tamamlanmış sayılmaz.
 *
 * KULLANIM
 * ----------------------------------------------------------------------------
 *   npm run dev            (ayrı bir terminalde)
 *   npx tsx scripts/test-panels.ts \
 *     --base http://localhost:3000 \
 *     --teacher 05xxxxxxxxx:sifre \
 *     --student 05xxxxxxxxx:sifre
 *
 * Test hesaplarının nasıl açılacağı: supabase-teacher-panel.sql'in sonundaki
 * "ÖĞRETMEN HESABI AÇMA" bölümü.
 *
 * ÇEREZLER ELLE TAŞINIYOR: Node'un fetch'i çerez saklamıyor ve oturum
 * httpOnly çerezde duruyor (tasarımın tamamı buna dayanıyor, bkz.
 * server/cookies.ts). Bu yüzden küçük bir çerez kavanozu var.
 *
 * ORIGIN BAŞLIĞI ELLE EKLENİYOR: requireTrustedOrigin durum değiştiren
 * isteklerde Origin'i ZORUNLU kılıyor. Tarayıcı bunu kendiliğinden gönderir,
 * Node göndermez — eklenmezse her POST/PUT 403 döner ve test yanlış yerden
 * kalır.
 */

interface Kimlik {
  phone: string;
  password: string;
}

function argOku(ad: string): string | undefined {
  const i = process.argv.indexOf(`--${ad}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function kimlikOku(ad: string): Kimlik {
  const ham = argOku(ad);
  if (!ham || !ham.includes(':')) {
    console.error(`--${ad} gerekli. Biçim: --${ad} 05xxxxxxxxx:sifre`);
    process.exit(1);
  }
  const ayirici = ham.indexOf(':');
  return { phone: ham.slice(0, ayirici), password: ham.slice(ayirici + 1) };
}

const BASE = (argOku('base') || 'http://localhost:3000').replace(/\/$/, '');
const OGRETMEN = kimlikOku('teacher');
const OGRENCI = kimlikOku('student');

/** Tek bir oturumun çerezleri. Her kullanıcı için ayrı kavanoz. */
class Kavanoz {
  private cerezler = new Map<string, string>();

  yut(response: Response) {
    /* getSetCookie() Node 20+ ve birden fazla Set-Cookie başlığını ayrı ayrı
       verir; tek bir get('set-cookie') hepsini virgülle birleştirir ve
       çerez değerlerindeki virgüllerle karışır. */
    for (const satir of response.headers.getSetCookie?.() ?? []) {
      const [ciftler] = satir.split(';');
      const esittir = ciftler.indexOf('=');
      if (esittir < 0) continue;
      const ad = ciftler.slice(0, esittir).trim();
      const deger = ciftler.slice(esittir + 1).trim();
      /* Boş değer + Expires geçmişte = silme talimatı. */
      if (deger === '') this.cerezler.delete(ad);
      else this.cerezler.set(ad, deger);
    }
  }

  basligi(): string {
    return [...this.cerezler].map(([a, d]) => `${a}=${d}`).join('; ');
  }
}

interface Cevap {
  status: number;
  body: any;
}

async function istek(
  kavanoz: Kavanoz,
  yol: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<Cevap> {
  const { method = 'GET', body } = opts;

  const headers: Record<string, string> = {
    /* Origin: tarayıcının kendiliğinden eklediği şey. Bkz. dosya başı. */
    Origin: BASE,
  };
  const cerez = kavanoz.basligi();
  if (cerez) headers.Cookie = cerez;
  if (body) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${BASE}${yol}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });

  kavanoz.yut(response);

  let veri: any = null;
  try {
    veri = await response.json();
  } catch {
    veri = null;
  }

  return { status: response.status, body: veri };
}

let toplam = 0;
let gecen = 0;

function kontrol(ad: string, kosul: boolean, ayrinti = '') {
  toplam += 1;
  if (kosul) gecen += 1;
  const etiket = kosul ? 'GEÇTİ' : 'KALDI';
  console.log(`  ${etiket}  ${ad}${ayrinti ? `  — ${ayrinti}` : ''}`);
}

async function girisYap(kimlik: Kimlik, etiket: string): Promise<Kavanoz | null> {
  const kavanoz = new Kavanoz();
  const cevap = await istek(kavanoz, '/api/auth/login', {
    method: 'POST',
    body: { phone: kimlik.phone, password: kimlik.password, website: '' },
  });

  if (cevap.status !== 200) {
    console.error(
      `\n  ${etiket} girişi başarısız (${cevap.status}): ${cevap.body?.error ?? ''}\n` +
        '  Hesap açıldı mı ve "Auto Confirm User" işaretli miydi? ' +
        '(supabase-teacher-panel.sql sonundaki bölüm)',
    );
    return null;
  }

  return kavanoz;
}

async function calistir() {
  console.log(`\nÖğretmen paneli HTTP testleri — ${BASE}\n`);

  /* ---------------------------------------------------------- ÖĞRETMEN */
  console.log('Öğretmen oturumu:');
  const ogretmen = await girisYap(OGRETMEN, 'Öğretmen');
  if (!ogretmen) process.exit(1);

  const ogretmenMe = await istek(ogretmen, '/api/auth/me');
  kontrol(
    'Giriş sonrası userType = teacher',
    ogretmenMe.body?.user?.userType === 'teacher',
    `alınan: ${ogretmenMe.body?.user?.userType}`,
  );

  const ogretmenOzet = await istek(ogretmen, '/api/teacher/ozet');
  kontrol('Öğretmen /api/teacher/ozet -> 200', ogretmenOzet.status === 200, `${ogretmenOzet.status}`);

  const program = await istek(ogretmen, '/api/teacher/schedule');
  kontrol('Öğretmen /api/teacher/schedule -> 200', program.status === 200, `${program.status}`);
  kontrol(
    'Program haftanın pazartesisini döndürüyor',
    typeof program.body?.weekStart === 'string' &&
      new Date(`${program.body.weekStart}T00:00:00Z`).getUTCDay() === 1,
    `weekStart: ${program.body?.weekStart}`,
  );

  const gelecekHafta = await istek(ogretmen, '/api/teacher/schedule?week=2027-01-01');
  kontrol(
    'week parametresi haftayı değiştiriyor',
    gelecekHafta.body?.weekStart === '2026-12-28',
    `alınan: ${gelecekHafta.body?.weekStart}`,
  );

  const bozukHafta = await istek(ogretmen, '/api/teacher/schedule?week=DROP%20TABLE');
  kontrol(
    'Geçersiz week -> hata değil, bu hafta',
    bozukHafta.status === 200 && bozukHafta.body?.weekStart === program.body?.weekStart,
    `${bozukHafta.status} / ${bozukHafta.body?.weekStart}`,
  );

  /* Planın 2. senaryosunun aynadaki hâli: öğretmen öğrenci ucuna gidiyor. */
  const ogretmenOgrenciUcu = await istek(ogretmen, '/api/portal/ozet');
  kontrol(
    'Öğretmen -> /api/portal/ozet ENGELLENİYOR (403)',
    ogretmenOgrenciUcu.status === 403,
    `${ogretmenOgrenciUcu.status}`,
  );

  const ogretmenYorumUcu = await istek(ogretmen, '/api/portal/yorumlar');
  kontrol(
    'Öğretmen -> /api/portal/yorumlar ENGELLENİYOR (403)',
    ogretmenYorumUcu.status === 403,
    `${ogretmenYorumUcu.status}`,
  );

  /*
   * YÖNETİM KAPISI. Bu testler diğerlerinden daha çok şey ölçüyor:
   * /api/admin/* servis rolüyle çalıştığı için RLS orada emniyet ağı DEĞİL —
   * bu 403'ler sınırın kendisi. Biri geçerse tüm öğrenci verisi açılır.
   */
  for (const [m, yol] of [
    ['GET', '/api/admin/ozet'],
    ['GET', '/api/admin/dersler'],
    ['GET', '/api/admin/odemeler'],
    ['POST', '/api/admin/hesaplar'],
  ] as const) {
    const r = await istek(ogretmen, yol, m === 'GET' ? {} : { method: m, body: {} });
    kontrol(`Öğretmen -> ${m} ${yol} ENGELLENİYOR (403)`, r.status === 403, `${r.status}`);
  }

  /*
   * DERS DÖNGÜSÜ: planlı ders -> "işlendi" -> yorum -> geri al.
   * Bu akış /schedule'ın döndürdüğü derslerle çalışıyor; ayrı bir
   * "tamamlananlar" ucu yok (panel de tek uçtan besleniyor).
   */
  const planliDers = (program.body?.lessons ?? []).find((d: any) => d.status === 'scheduled');

  if (!planliDers) {
    console.log('  ATLANDI  Ders döngüsü — bu hafta planlı ders yok');
    console.log("           (Supabase'de test öğretmenine bu haftaya bir ders ekleyin)");
  } else {
    /* Planın 3. senaryosu: tamamlanmamış derse yorum yazılamamalı. */
    const erkenYorum = await istek(ogretmen, `/api/teacher/lessons/${planliDers.id}/comment`, {
      method: 'PUT',
      body: { comment: 'Tamamlanmamış derse yorum denemesi' },
    });
    kontrol(
      'Tamamlanmamış derse yorum ENGELLENİYOR (400)',
      erkenYorum.status === 400,
      `${erkenYorum.status}: ${erkenYorum.body?.error ?? ''}`,
    );

    /* Geçersiz durum değeri — 'cancelled' dahil (iptal bir yönetim kararı). */
    for (const kotu of ['cancelled', 'silindi', '']) {
      const r = await istek(ogretmen, `/api/teacher/lessons/${planliDers.id}/status`, {
        method: 'PATCH',
        body: { status: kotu },
      });
      kontrol(`Geçersiz durum "${kotu}" -> 400`, r.status === 400, `${r.status}`);
    }

    /* "Ders işlendi" */
    const isaretle = await istek(ogretmen, `/api/teacher/lessons/${planliDers.id}/status`, {
      method: 'PATCH',
      body: { status: 'completed' },
    });
    kontrol('Ders "işlendi" yapılıyor (200)', isaretle.status === 200, `${isaretle.status}`);
    kontrol('Yanıt yeni durumu döndürüyor', isaretle.body?.status === 'completed', `${isaretle.body?.status}`);

    /* Artık yorum yazılabilmeli */
    const yorum1 = await istek(ogretmen, `/api/teacher/lessons/${planliDers.id}/comment`, {
      method: 'PUT',
      body: { comment: 'Birinci deneme yorumu' },
    });
    kontrol('İşlendi sonrası yorum yazılabiliyor (200)', yorum1.status === 200, `${yorum1.status}`);

    /* Planın 4. senaryosu: üzerine yazma (tek satır kalmalı — satır sayısı
       veritabanı testinde doğrulanıyor, burada son metnin dönmesi ölçülüyor). */
    const yorum2 = await istek(ogretmen, `/api/teacher/lessons/${planliDers.id}/comment`, {
      method: 'PUT',
      body: { comment: 'İkinci deneme yorumu' },
    });
    kontrol(
      'Yorum üzerine yazılıyor (upsert)',
      yorum2.status === 200 && yorum2.body?.comment?.text === 'İkinci deneme yorumu',
      `${yorum2.status}`,
    );

    /* Doğrulama sınırları */
    const bosYorum = await istek(ogretmen, `/api/teacher/lessons/${planliDers.id}/comment`, {
      method: 'PUT', body: { comment: '   ' },
    });
    kontrol('Boş yorum ENGELLENİYOR (400)', bosYorum.status === 400, `${bosYorum.status}`);

    const uzunYorum = await istek(ogretmen, `/api/teacher/lessons/${planliDers.id}/comment`, {
      method: 'PUT', body: { comment: 'a'.repeat(2001) },
    });
    kontrol('2000+ karakter yorum ENGELLENİYOR (400)', uzunYorum.status === 400, `${uzunYorum.status}`);

    /* Yorum programda görünüyor mu (tek uçtan besleniyor) */
    const tazeProgram = await istek(ogretmen, '/api/teacher/schedule');
    const tazeDers = (tazeProgram.body?.lessons ?? []).find((d: any) => d.id === planliDers.id);
    kontrol(
      'Yorum /schedule cevabında dönüyor',
      tazeDers?.comment?.text === 'İkinci deneme yorumu',
      `${tazeDers?.comment?.text ?? 'YOK'}`,
    );

    /* Geri alma — ve yorumun SİLİNMEDİĞİ */
    const geriAl = await istek(ogretmen, `/api/teacher/lessons/${planliDers.id}/status`, {
      method: 'PATCH', body: { status: 'scheduled' },
    });
    kontrol('İşaretleme geri alınabiliyor (200)', geriAl.status === 200, `${geriAl.status}`);

    const geriSonra = await istek(ogretmen, '/api/teacher/schedule');
    const geriDers = (geriSonra.body?.lessons ?? []).find((d: any) => d.id === planliDers.id);
    kontrol(
      'Geri alınca yorum SİLİNMİYOR',
      geriDers?.comment?.text === 'İkinci deneme yorumu',
      `${geriDers?.comment?.text ?? 'SİLİNDİ'}`,
    );
    kontrol('Geri alınca durum scheduled', geriDers?.status === 'scheduled', `${geriDers?.status}`);
  }

  /* IDOR: var olmayan/başkasına ait bir ders kimliği. */
  const yabanciDers = await istek(
    ogretmen,
    '/api/teacher/lessons/99999999-9999-4999-8999-999999999999/comment',
    { method: 'PUT', body: { comment: 'Başkasının dersi' } },
  );
  kontrol(
    'Başkasının/olmayan dersine yorum ENGELLENİYOR (403)',
    yabanciDers.status === 403,
    `${yabanciDers.status}`,
  );

  const yabanciDurum = await istek(
    ogretmen,
    '/api/teacher/lessons/99999999-9999-4999-8999-999999999999/status',
    { method: 'PATCH', body: { status: 'completed' } },
  );
  kontrol(
    'Başkasının/olmayan dersini işaretleme ENGELLENİYOR (403)',
    yabanciDurum.status === 403,
    `${yabanciDurum.status}`,
  );

  /* ----------------------------------------------------------- ÖĞRENCİ */
  console.log('\nÖğrenci oturumu:');
  const ogrenci = await girisYap(OGRENCI, 'Öğrenci');
  if (!ogrenci) process.exit(1);

  const ogrenciMe = await istek(ogrenci, '/api/auth/me');
  kontrol(
    'Giriş sonrası userType = student',
    ogrenciMe.body?.user?.userType === 'student',
    `alınan: ${ogrenciMe.body?.user?.userType}`,
  );

  const ogrenciOzet = await istek(ogrenci, '/api/portal/ozet');
  kontrol('Öğrenci /api/portal/ozet -> 200', ogrenciOzet.status === 200, `${ogrenciOzet.status}`);

  const ogrenciYorumlar = await istek(ogrenci, '/api/portal/yorumlar');
  kontrol('Öğrenci /api/portal/yorumlar -> 200', ogrenciYorumlar.status === 200, `${ogrenciYorumlar.status}`);

  /* Planın 2. senaryosu. */
  const ogrenciOgretmenUcu = await istek(ogrenci, '/api/teacher/schedule');
  kontrol(
    'Öğrenci -> /api/teacher/schedule ENGELLENİYOR (403)',
    ogrenciOgretmenUcu.status === 403,
    `${ogrenciOgretmenUcu.status}`,
  );

  const ogrenciYorumYazma = await istek(
    ogrenci,
    '/api/teacher/lessons/99999999-9999-4999-8999-999999999999/comment',
    { method: 'PUT', body: { comment: 'Öğrenci yorum yazıyor' } },
  );
  kontrol(
    'Öğrenci yorum YAZAMIYOR (403)',
    ogrenciYorumYazma.status === 403,
    `${ogrenciYorumYazma.status}`,
  );

  const ogrenciIsaretleme = await istek(
    ogrenci,
    '/api/teacher/lessons/99999999-9999-4999-8999-999999999999/status',
    { method: 'PATCH', body: { status: 'completed' } },
  );
  kontrol(
    'Öğrenci dersi "işlendi" YAPAMIYOR (403)',
    ogrenciIsaretleme.status === 403,
    `${ogrenciIsaretleme.status}`,
  );

  for (const [m, yol] of [
    ['GET', '/api/admin/ozet'],
    ['POST', '/api/admin/hesaplar'],
    ['POST', '/api/admin/odemeler'],
  ] as const) {
    const r = await istek(ogrenci, yol, m === 'GET' ? {} : { method: m, body: {} });
    kontrol(`Öğrenci -> ${m} ${yol} ENGELLENİYOR (403)`, r.status === 403, `${r.status}`);
  }

  /* --------------------------------------------------------- OTURUMSUZ */
  console.log('\nOturumsuz:');
  const bos = new Kavanoz();
  for (const yol of ['/api/portal/ozet', '/api/portal/yorumlar', '/api/teacher/schedule',
                     '/api/admin/ozet', '/api/admin/dersler', '/api/admin/odemeler']) {
    const cevap = await istek(bos, yol);
    kontrol(`Oturumsuz ${yol} -> 401`, cevap.status === 401, `${cevap.status}`);
  }

  console.log(`\n${gecen}/${toplam} test geçti.\n`);
  process.exit(gecen === toplam ? 0 : 1);
}

calistir().catch((err) => {
  console.error('\nTest çalıştırılamadı:', err?.message || err);
  console.error('Sunucu ayakta mı? (npm run dev)');
  process.exit(1);
});
