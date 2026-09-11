/*
 * PANELLER — CANLI UÇTAN UCA DOĞRULAMA
 * ============================================================================
 * Üç panelin (yönetim, öğretmen, öğrenci) birlikte çalıştığını gerçek HTTP
 * üzerinden ölçer: yönetici hesap açar, ders atar, ücret girer; açılan
 * öğretmen hesabıyla giriş yapılır, ders "işlendi" yapılıp yorum yazılır;
 * açılan öğrenci hesabıyla girilip ders, ödeme ve yorumun göründüğü
 * doğrulanır. Sonunda roller arası 403'ler sınanır ve test verisi silinir.
 *
 * NEDEN CANLIYA KARŞI ÇALIŞIR
 * ----------------------------------------------------------------------------
 * Yereldeki .env'de servis rolü anahtarı BİLEREK yok ve login'in kendisi de
 * ona bağlı — yani localhost'ta hiç giriş yapılamıyor. Doğrulamanın yeri
 * canlı dağıtım (bkz. CLAUDE.md > "How this project is verified").
 *
 * KULLANIM
 * ----------------------------------------------------------------------------
 *   npm run test:panels -- --base https://www.akademitu.com \
 *     --admin 05xxxxxxxxx:yonetici-sifresi
 *
 * Yalnızca YÖNETİCİ kimliği gerekiyor; öğretmen ve öğrenci hesaplarını betik
 * kendisi açar (bu zaten test edilen şeylerden biri). Hazır hesaplarla
 * çalışmak isterseniz --teacher / --student ekleyebilirsiniz.
 *
 * ŞİFRE KOMUT SATIRINDAN GEÇER, yani kabuk geçmişinize yazılır. Paylaşılan
 * bir makinede çalıştırıyorsanız komutun başına boşluk koyun ya da sonradan
 * yönetim panelinden şifreyi değiştirin.
 *
 * NE YAZAR, NE SİLER
 * ----------------------------------------------------------------------------
 * Açtığı DERS ve ÖDEME kayıtlarını sonunda siler. Açtığı HESAPLARI silmez —
 * panelde hesap silme bilerek yok (bkz. AdminAccounts.tsx); kimlikleri ekrana
 * yazar, gerekirse Supabase Dashboard'dan kaldırılır.
 *
 * ÇEREZLER ELLE TAŞINIR: oturum httpOnly çerezde ve Node'un fetch'i çerez
 * saklamıyor. ORIGIN başlığı da elle eklenir: requireTrustedOrigin durum
 * değiştiren isteklerde onu zorunlu kılıyor ve tarayıcı dışında kimse
 * göndermiyor — eklenmezse her POST 403 döner ve test yanlış yerden kalır.
 */

interface Kimlik {
  phone: string;
  password: string;
}

function argOku(ad: string): string | undefined {
  const i = process.argv.indexOf(`--${ad}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function kimlikAyristir(ham: string | undefined): Kimlik | null {
  if (!ham || !ham.includes(":")) return null;
  const i = ham.indexOf(":");
  return { phone: ham.slice(0, i), password: ham.slice(i + 1) };
}

const BASE = (argOku("base") || "https://www.akademitu.com").replace(/\/$/, "");
const YONETICI = kimlikAyristir(argOku("admin"));
let OGRETMEN = kimlikAyristir(argOku("teacher"));
let OGRENCI = kimlikAyristir(argOku("student"));

if (!YONETICI) {
  console.error("--admin gerekli. Biçim: --admin 05xxxxxxxxx:sifre");
  process.exit(1);
}

/** Tek bir oturumun çerezleri. Her kullanıcı için ayrı kavanoz. */
class Kavanoz {
  private cerezler = new Map<string, string>();

  yut(response: Response) {
    /* getSetCookie() her Set-Cookie başlığını ayrı verir; tek bir
       get("set-cookie") hepsini virgülle birleştirip çerez değerlerindeki
       virgüllerle karıştırırdı. */
    for (const satir of response.headers.getSetCookie?.() ?? []) {
      const [cift] = satir.split(";");
      const esittir = cift.indexOf("=");
      if (esittir < 0) continue;
      const ad = cift.slice(0, esittir).trim();
      const deger = cift.slice(esittir + 1).trim();
      /* Boş değer = silme talimatı. */
      if (deger === "") this.cerezler.delete(ad);
      else this.cerezler.set(ad, deger);
    }
  }

  basligi(): string {
    return [...this.cerezler].map(([a, d]) => `${a}=${d}`).join("; ");
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
  const { method = "GET", body } = opts;
  const headers: Record<string, string> = { Origin: BASE };
  const cerez = kavanoz.basligi();
  if (cerez) headers.Cookie = cerez;
  if (body) headers["Content-Type"] = "application/json";

  const response = await fetch(`${BASE}${yol}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
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
const kalanlar: string[] = [];

function kontrol(ad: string, kosul: boolean, ayrinti = "") {
  toplam += 1;
  if (kosul) gecen += 1;
  else kalanlar.push(`${ad}${ayrinti ? ` — ${ayrinti}` : ""}`);
  console.log(`  ${kosul ? "GEÇTİ" : "KALDI"}  ${ad}${ayrinti ? `  (${ayrinti})` : ""}`);
}

async function girisYap(kimlik: Kimlik, etiket: string) {
  const kavanoz = new Kavanoz();
  const cevap = await istek(kavanoz, "/api/auth/login", {
    method: "POST",
    body: { phone: kimlik.phone, password: kimlik.password, website: "" },
  });

  if (cevap.status !== 200) {
    console.error(`\n  ${etiket} girişi başarısız (${cevap.status}): ${cevap.body?.error ?? ""}`);
    return null;
  }
  return { kavanoz, user: cevap.body.user };
}

/* Test hesaplarının numaraları çalıştırma anından türetiliyor: aynı betiğin
   iki koşusu birbirinin numarasına çarpmasın (profiles.phone UNIQUE). */
const DAMGA = Date.now().toString().slice(-7);
const URETILEN = {
  teacherPhone: `0555${DAMGA}`,
  studentPhone: `0556${DAMGA}`,
  password: `Test${DAMGA}aA!`,
};

async function calistir() {
  console.log(`\nPanel testleri — ${BASE}\n`);

  /* =============================================================== YÖNETİCİ */
  console.log("1) Yönetici");
  const yonetici = await girisYap(YONETICI!, "Yönetici");
  if (!yonetici) {
    console.error("  Yönetici girişi olmadan devam edilemez.");
    process.exit(1);
  }
  kontrol("userType = admin", yonetici.user?.userType === "admin", `${yonetici.user?.userType}`);

  let r = await istek(yonetici.kavanoz, "/api/admin/ozet");
  kontrol("GET /api/admin/ozet -> 200", r.status === 200, `${r.status}`);
  const oncekiSayi = r.body?.accounts?.length ?? 0;

  /* Yönetici, diğer iki panelin uçlarına GİREMEZ: rol kapısı tek rol kabul
     ediyor ve bu bilinçli (bkz. CLAUDE.md > admin bölümü). */
  for (const yol of ["/api/portal/ozet", "/api/teacher/schedule"]) {
    const x = await istek(yonetici.kavanoz, yol);
    kontrol(`Yönetici -> ${yol} ENGELLENİYOR (403)`, x.status === 403, `${x.status}`);
  }

  /* Son yöneticinin kendini kilitlemesi engelleniyor. */
  r = await istek(yonetici.kavanoz, `/api/admin/hesaplar/${yonetici.user.id}`, {
    method: "PATCH",
    body: { userType: "student" },
  });
  kontrol("Yönetici kendi rolünü DÜŞÜREMİYOR (400)", r.status === 400, `${r.status}`);

  /* ================================================================ HESAPLAR */
  console.log("\n2) Hesap açma");
  let ogretmenId: string | undefined;
  let ogrenciId: string | undefined;

  if (!OGRETMEN) {
    r = await istek(yonetici.kavanoz, "/api/admin/hesaplar", {
      method: "POST",
      body: {
        fullName: "TEST Ogretmen",
        phone: URETILEN.teacherPhone,
        password: URETILEN.password,
        userType: "teacher",
      },
    });
    kontrol("Öğretmen hesabı açıldı (200)", r.status === 200, `${r.status} ${r.body?.error ?? ""}`);
    ogretmenId = r.body?.account?.id;
    OGRETMEN = { phone: URETILEN.teacherPhone, password: URETILEN.password };
  }

  if (!OGRENCI) {
    r = await istek(yonetici.kavanoz, "/api/admin/hesaplar", {
      method: "POST",
      body: {
        fullName: "TEST Ogrenci",
        phone: URETILEN.studentPhone,
        password: URETILEN.password,
        userType: "student",
      },
    });
    kontrol("Öğrenci hesabı açıldı (200)", r.status === 200, `${r.status} ${r.body?.error ?? ""}`);
    ogrenciId = r.body?.account?.id;
    OGRENCI = { phone: URETILEN.studentPhone, password: URETILEN.password };
  }

  /* Doğrulama sınırları */
  r = await istek(yonetici.kavanoz, "/api/admin/hesaplar", {
    method: "POST",
    body: { fullName: "X", phone: URETILEN.teacherPhone, password: URETILEN.password, userType: "teacher" },
  });
  kontrol("Aynı telefonla ikinci hesap ENGELLENİYOR (409)", r.status === 409, `${r.status}`);

  r = await istek(yonetici.kavanoz, "/api/admin/hesaplar", {
    method: "POST",
    body: { fullName: "X", phone: "12345", password: URETILEN.password, userType: "teacher" },
  });
  kontrol("Geçersiz telefon ENGELLENİYOR (400)", r.status === 400, `${r.status}`);

  r = await istek(yonetici.kavanoz, "/api/admin/hesaplar", {
    method: "POST",
    body: { fullName: "X", phone: `0557${DAMGA}`, password: "kisa", userType: "teacher" },
  });
  kontrol("8 karakterden kısa şifre ENGELLENİYOR (400)", r.status === 400, `${r.status}`);

  r = await istek(yonetici.kavanoz, "/api/admin/ozet");
  const beklenen = oncekiSayi + (ogretmenId ? 1 : 0) + (ogrenciId ? 1 : 0);
  kontrol(
    "Liste yeni hesapları gösteriyor",
    (r.body?.accounts?.length ?? 0) === beklenen,
    `${r.body?.accounts?.length} (beklenen ${beklenen})`,
  );

  /* Açılan hesapların kimlikleri hazır gelmediyse listeden çözülüyor. */
  const hepsi = r.body?.accounts ?? [];
  ogretmenId ??= hepsi.find((h: any) => h.phone === OGRETMEN!.phone)?.id;
  ogrenciId ??= hepsi.find((h: any) => h.phone === OGRENCI!.phone)?.id;

  /* ================================================================== DERSLER */
  console.log("\n3) Ders atama");
  const simdi = Date.now();
  const baslangic = new Date(simdi + 2 * 3600_000).toISOString();
  const bitis = new Date(simdi + 3 * 3600_000).toISOString();

  r = await istek(yonetici.kavanoz, "/api/admin/dersler", {
    method: "POST",
    body: {
      studentId: ogrenciId,
      teacherId: ogretmenId,
      subject: "TEST TYT Matematik",
      startsAt: baslangic,
      endsAt: bitis,
      kind: "ders",
      status: "scheduled",
    },
  });
  kontrol("Ders atandı (200)", r.status === 200, `${r.status} ${r.body?.error ?? ""}`);
  const dersId = r.body?.id;

  /* Rol doğrulaması: veritabanı bunu yapmıyor, route yapıyor. */
  r = await istek(yonetici.kavanoz, "/api/admin/dersler", {
    method: "POST",
    body: { studentId: ogretmenId, subject: "X", startsAt: baslangic, kind: "ders", status: "scheduled" },
  });
  kontrol("Öğretmen, öğrenci alanına KONAMIYOR (400)", r.status === 400, `${r.status}`);

  r = await istek(yonetici.kavanoz, "/api/admin/dersler");
  const listeDers = (r.body?.lessons ?? []).find((d: any) => d.id === dersId);
  kontrol(
    "Ders listede ve adlar çözülmüş",
    Boolean(listeDers?.studentName && listeDers?.teacherName),
    `${listeDers?.studentName} / ${listeDers?.teacherName}`,
  );

  /* =================================================================== ÜCRET */
  console.log("\n4) Ücret girme");
  r = await istek(yonetici.kavanoz, "/api/admin/odemeler", {
    method: "POST",
    body: {
      studentId: ogrenciId,
      period: "TEST-2026-09",
      amount: "9500,50",
      currency: "TRY",
      status: "bekliyor",
      dueOn: "2026-09-30",
    },
  });
  kontrol("Ödeme eklendi (200)", r.status === 200, `${r.status} ${r.body?.error ?? ""}`);
  const odemeId = r.body?.id;

  r = await istek(yonetici.kavanoz, "/api/admin/odemeler");
  const listeOdeme = (r.body?.payments ?? []).find((o: any) => o.id === odemeId);
  kontrol("Virgüllü tutar doğru çözüldü", listeOdeme?.amount === 9500.5, `${listeOdeme?.amount}`);

  r = await istek(yonetici.kavanoz, `/api/admin/odemeler/${odemeId}`, {
    method: "PATCH",
    body: {
      studentId: ogrenciId,
      period: "TEST-2026-09",
      amount: 12000,
      currency: "TRY",
      status: "odendi",
      dueOn: null,
    },
  });
  kontrol("Ödeme düzenlendi (200)", r.status === 200, `${r.status}`);

  /* ================================================================ ÖĞRETMEN */
  console.log("\n5) Öğretmen paneli");
  const ogretmen = await girisYap(OGRETMEN!, "Öğretmen");
  if (!ogretmen) {
    console.error("  Panelden açılan hesapla giriş yapılamadı — Admin API akışı bozuk.");
    process.exit(1);
  }
  kontrol("Panelden açılan hesapla giriş yapılabiliyor", true, "Admin API akışı doğru");
  kontrol("userType = teacher", ogretmen.user?.userType === "teacher", `${ogretmen.user?.userType}`);

  r = await istek(ogretmen.kavanoz, "/api/teacher/schedule");
  kontrol("Program -> 200", r.status === 200, `${r.status}`);
  kontrol(
    "Atanan ders öğretmenin programında",
    (r.body?.lessons ?? []).some((d: any) => d.id === dersId),
    `${(r.body?.lessons ?? []).length} ders`,
  );

  /* Tamamlanmamış derse yorum reddedilmeli. */
  r = await istek(ogretmen.kavanoz, `/api/teacher/lessons/${dersId}/comment`, {
    method: "PUT",
    body: { comment: "Erken yorum denemesi" },
  });
  kontrol("Tamamlanmamış derse yorum ENGELLENİYOR (400)", r.status === 400, `${r.status}`);

  r = await istek(ogretmen.kavanoz, `/api/teacher/lessons/${dersId}/status`, {
    method: "PATCH",
    body: { status: "completed" },
  });
  kontrol('Ders "işlendi" yapıldı (200)', r.status === 200, `${r.status}`);

  r = await istek(ogretmen.kavanoz, `/api/teacher/lessons/${dersId}/status`, {
    method: "PATCH",
    body: { status: "cancelled" },
  });
  kontrol("Öğretmen dersi İPTAL EDEMİYOR (400)", r.status === 400, `${r.status}`);

  const YORUM = "TEST yorumu — uçtan uca doğrulama.";
  r = await istek(ogretmen.kavanoz, `/api/teacher/lessons/${dersId}/comment`, {
    method: "PUT",
    body: { comment: YORUM },
  });
  kontrol("Yorum yazıldı (200)", r.status === 200, `${r.status}`);

  r = await istek(ogretmen.kavanoz, `/api/teacher/lessons/${dersId}/comment`, {
    method: "PUT",
    body: { comment: "   " },
  });
  kontrol("Boş yorum ENGELLENİYOR (400)", r.status === 400, `${r.status}`);

  r = await istek(
    ogretmen.kavanoz,
    "/api/teacher/lessons/99999999-9999-4999-8999-999999999999/comment",
    { method: "PUT", body: { comment: "Başkasının dersi" } },
  );
  kontrol("Başkasının dersine yorum ENGELLENİYOR (403)", r.status === 403, `${r.status}`);

  /* ================================================================= ÖĞRENCİ */
  console.log("\n6) Öğrenci paneli");
  const ogrenci = await girisYap(OGRENCI!, "Öğrenci");
  if (!ogrenci) {
    console.error("  Öğrenci girişi başarısız.");
    process.exit(1);
  }
  kontrol("userType = student", ogrenci.user?.userType === "student", `${ogrenci.user?.userType}`);

  r = await istek(ogrenci.kavanoz, "/api/portal/ozet");
  kontrol("Öğrenci paneli -> 200", r.status === 200, `${r.status}`);
  kontrol(
    "Girilen ücret öğrencinin panelinde",
    (r.body?.payments ?? []).some((o: any) => o.id === odemeId),
    `${(r.body?.payments ?? []).length} ödeme`,
  );

  r = await istek(ogrenci.kavanoz, "/api/portal/yorumlar");
  kontrol("Koçun yorumları -> 200", r.status === 200, `${r.status}`);
  const yorumlu = (r.body?.lessons ?? []).find((d: any) => d.id === dersId);
  kontrol("Öğretmenin yorumu öğrenciye görünüyor", yorumlu?.comment?.text === YORUM,
    `${yorumlu?.comment?.text ?? "YOK"}`);

  /* =========================================================== ROL İZOLASYONU */
  console.log("\n7) Rol izolasyonu");
  for (const [ad, kav] of [
    ["Öğretmen", ogretmen.kavanoz],
    ["Öğrenci", ogrenci.kavanoz],
  ] as const) {
    for (const yol of ["/api/admin/ozet", "/api/admin/dersler", "/api/admin/odemeler"]) {
      const x = await istek(kav, yol);
      kontrol(`${ad} -> ${yol} ENGELLENİYOR (403)`, x.status === 403, `${x.status}`);
    }
    const y = await istek(kav, "/api/admin/hesaplar", {
      method: "POST",
      body: { fullName: "Sizma", phone: `0558${DAMGA}`, password: "AAaa12345", userType: "admin" },
    });
    kontrol(`${ad} hesap AÇAMIYOR (403)`, y.status === 403, `${y.status}`);
  }

  const ogrenciOgretmenUcu = await istek(ogrenci.kavanoz, "/api/teacher/schedule");
  kontrol("Öğrenci -> /api/teacher/schedule ENGELLENİYOR (403)",
    ogrenciOgretmenUcu.status === 403, `${ogrenciOgretmenUcu.status}`);

  const ogretmenOgrenciUcu = await istek(ogretmen.kavanoz, "/api/portal/ozet");
  kontrol("Öğretmen -> /api/portal/ozet ENGELLENİYOR (403)",
    ogretmenOgrenciUcu.status === 403, `${ogretmenOgrenciUcu.status}`);

  /* ================================================================ OTURUMSUZ */
  console.log("\n8) Oturumsuz");
  const bos = new Kavanoz();
  for (const yol of [
    "/api/portal/ozet",
    "/api/portal/yorumlar",
    "/api/teacher/schedule",
    "/api/admin/ozet",
  ]) {
    const x = await istek(bos, yol);
    kontrol(`Oturumsuz ${yol} -> 401`, x.status === 401, `${x.status}`);
  }

  /* ================================================================== TEMİZLİK */
  console.log("\n9) Temizlik");
  r = await istek(yonetici.kavanoz, `/api/admin/dersler/${dersId}`, { method: "DELETE" });
  kontrol("Test dersi silindi", r.status === 200, `${r.status}`);
  r = await istek(yonetici.kavanoz, `/api/admin/odemeler/${odemeId}`, { method: "DELETE" });
  kontrol("Test ödemesi silindi", r.status === 200, `${r.status}`);

  console.log(`\n${gecen}/${toplam} test geçti.`);
  if (kalanlar.length) {
    console.log("\nKALANLAR:");
    for (const x of kalanlar) console.log(`  - ${x}`);
  }

  if (ogretmenId || ogrenciId) {
    console.log("\nBETİĞİN AÇTIĞI HESAPLAR (silinmedi — panelde hesap silme yok):");
    if (ogretmenId) console.log(`  TEST Ogretmen  ${OGRETMEN!.phone}`);
    if (ogrenciId) console.log(`  TEST Ogrenci   ${OGRENCI!.phone}`);
    console.log(`  şifre: ${URETILEN.password}`);
  }

  process.exit(gecen === toplam ? 0 : 1);
}

calistir().catch((err) => {
  console.error("\nTest çalıştırılamadı:", err?.message || err);
  process.exit(1);
});
