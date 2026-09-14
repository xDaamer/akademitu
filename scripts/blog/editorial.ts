import { Diagnostics } from "./frontmatter.js";
import { asciiFold, slugify } from "./slug.js";

/**
 * EDİTORYAL KURALLAR — FAZ 2'nin makineye devredilebilen kısmı
 * ============================================================================
 * Faz 2 §4 bir "yayın öncesi kontrol listesi" tanımlıyor ve "panelde tik
 * atılacak" diyor. Panel yok; ama asıl mesele o değil: TİK ATILAN LİSTE
 * UNUTULUR. Üçüncü ayın sonunda kimse on beş maddeyi tek tek okumaz, hepsine
 * tik atar. Ölçülen bir liste unutulmaz.
 *
 * Bu dosya listenin ölçülebilir maddelerini uyguluyor. Ölçülemeyenler
 * (H2'nin altındaki ilk paragraf soruyu doğrudan cevaplıyor mu, ton öğrenciye
 * mi veliye mi, karşılaştırma dürüst mü) BİLEREK dışarıda: uydurma bir ölçüt
 * yazmak, insanı yanlış bir güvene sokar. Onlar STIL-REHBERI.md'de, insan
 * kararı olarak kalıyor.
 *
 * HATA / UYARI AYRIMI burada da geçerli: yayını durduran şey ya hukuki risk
 * (garanti vaadi) ya da kümeyi bozan yapısal eksiklik. Geri kalan uyarı.
 */

/* -------------------------------------------------------------------------
 * ARKETİPLER (Faz 2 §2)
 * Her yazı sekiz kalıptan birine oturur. Kalıp yalnızca bir etiket değil:
 * kelime aralığını ve o türün olmazsa olmaz ögesini de belirliyor.
 * ----------------------------------------------------------------------- */

export interface Archetype {
  label: string;
  /** Hedef kelime aralığı. min=0 -> serbest (araç sayfaları). */
  min: number;
  max: number;
  /** Yazının merkezinde tablo olmalı mı? */
  needsTable: boolean;
  /** Somut, sayılı bir örnek bölümü ("## Örnek: ...") olmalı mı? */
  needsExample: boolean;
  /** Sayısal veri kaynaklandırılmalı mı? */
  needsSource: boolean;
  /** Sayfada görünür SSS için en az kaç soru beklendiği. */
  faqMin: number;
}

export const ARCHETYPES: Record<string, Archetype> = {
  pillar: { label: "Pillar / nihai rehber", min: 2500, max: 4000, needsTable: true, needsExample: false, needsSource: false, faqMin: 5 },
  veri: { label: "Veri / referans", min: 900, max: 1500, needsTable: true, needsExample: false, needsSource: true, faqMin: 3 },
  nasil: { label: "Nasıl yapılır / yöntem", min: 1200, max: 1800, needsTable: false, needsExample: true, needsSource: false, faqMin: 3 },
  karar: { label: "Karar / karşılaştırma", min: 1200, max: 1800, needsTable: true, needsExample: false, needsSource: false, faqMin: 3 },
  guncel: { label: "Güncel / duyuru", min: 600, max: 900, needsTable: true, needsExample: false, needsSource: false, faqMin: 0 },
  veli: { label: "Veli rehberi", min: 1000, max: 1500, needsTable: false, needsExample: true, needsSource: false, faqMin: 3 },
  vaka: { label: "Başarı hikâyesi / vaka", min: 800, max: 1200, needsTable: false, needsExample: false, needsSource: false, faqMin: 0 },
  arac: { label: "Araç / şablon", min: 0, max: 0, needsTable: false, needsExample: false, needsSource: false, faqMin: 0 },
};

export const ARCHETYPE_KEYS = Object.keys(ARCHETYPES);

/* -------------------------------------------------------------------------
 * YASAK İFADELER (Faz 2 §2, Tür 4)
 * "Garanti", "%100 başarı", puan taahhüdü — hem etik dışı hem reklam
 * mevzuatı riski. Bu yüzden uyarı değil HATA: yayına çıkmamalı.
 *
 * Kalıplar dar tutuldu. "garanti" kelimesi tek başına yasaklanırsa
 * "iade garantisi yoktur" gibi meşru bir cümle de engellenirdi; aranan şey
 * SONUÇ TAAHHÜDÜ.
 * ----------------------------------------------------------------------- */
const BANNED_CLAIMS: { pattern: RegExp; why: string }[] = [
  { pattern: /%\s*100\s+başarı/i, why: "sonuç taahhüdü" },
  { pattern: /başarı\s+garanti/i, why: "sonuç taahhüdü" },
  { pattern: /garanti\w*\s+(başarı|sonuç|puan|sıralama|net)/i, why: "sonuç taahhüdü" },
  { pattern: /(puan|net|sıralama)\w*\s+garanti/i, why: "puan taahhüdü" },
  { pattern: /kesin\s+sonuç/i, why: "sonuç taahhüdü" },
  { pattern: /kesinlikle\s+(kazan|başar)/i, why: "sonuç taahhüdü" },
  { pattern: /mutlaka\s+kazan/i, why: "sonuç taahhüdü" },
];

/**
 * Faz 2 §3.8: anchor metni açıklayıcı olmalı — "buraya tıklayın" değil,
 * "deneme sınavı analizi nasıl yapılır".
 *
 * Kalıplar asciiFold'dan GEÇMİŞ metne uygulanıyor ("tıklayın" -> "tiklayin"),
 * bu yüzden burada Türkçe karakter aranmıyor. Çoğu zayıf anchor tek kelime
 * değil iki kelimedir ("buraya tıklayın"), o yüzden hepsinde isteğe bağlı
 * ikinci bir kelime var.
 */
const WEAK_ANCHORS: RegExp[] = [
  /^bura(ya|da)(\s+\S+)?$/,
  /^tikla\w*(\s+\S+)?$/,
  /^(bu\s+)?link\w*$/,
  /^devami\w*(\s+\S+)?$/,
  /^daha\s+fazla(\s+\S+)?$/,
  /^(oku\w*|incele\w*|goruntule\w*|bak\w*|gor\w*)$/,
];

const isWeakAnchor = (text: string) => {
  const folded = asciiFold(text).trim();
  return WEAK_ANCHORS.some((pattern) => pattern.test(folded));
};

/* -------------------------------------------------------------------------
 * GÖVDE ÇÖZÜMLEMESİ
 * Tam bir markdown ayrıştırıcısı değil — kural ölçmeye yetecek kadar blok
 * ayırımı. Gerçek ayrıştırma render adımında (markdown-it) yapılıyor; burada
 * amaç yapıyı ÖLÇMEK, HTML üretmek değil.
 * ----------------------------------------------------------------------- */

export interface Heading {
  level: number;
  text: string;
  line: number;
}

export interface BodyAnalysis {
  headings: Heading[];
  paragraphs: { text: string; line: number }[];
  tableCount: number;
  listCount: number;
  images: { alt: string; src: string }[];
  links: { text: string; href: string }[];
  /** Görsel kırılma olmadan geçilen en uzun kelime aralığı (Faz 2 §3.2). */
  longestDryRun: number;
  words: number;
}

const isTableRow = (line: string) => /^\s*\|.*\|\s*$/.test(line);
const isListItem = (line: string) => /^\s*([-*+]|\d+\.)\s+/.test(line);
const isQuote = (line: string) => /^\s*>/.test(line);
const isBoxFence = (line: string) => /^\s*:::/.test(line);

function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

export function analyzeBody(markdown: string): BodyAnalysis {
  const lines = markdown.split(/\r?\n/);

  const headings: Heading[] = [];
  const paragraphs: { text: string; line: number }[] = [];
  let tableCount = 0;
  let listCount = 0;
  let words = 0;
  let dryRun = 0;
  let longestDryRun = 0;

  let inFence = false;
  let inTable = false;
  let inList = false;
  let paragraph: string[] = [];
  let paragraphLine = 0;

  /* Görsel kırılma: tablo, liste, kutu, alıntı ya da görsel. Faz 2 §3.2
     her 300 kelimede bir bunlardan biri olsun diyor. */
  const breakHere = () => {
    longestDryRun = Math.max(longestDryRun, dryRun);
    dryRun = 0;
  };

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const text = paragraph.join(" ").trim();
    if (text) {
      paragraphs.push({ text, line: paragraphLine });
      const count = countWords(text);
      words += count;
      dryRun += count;
    }
    paragraph = [];
  };

  lines.forEach((line, index) => {
    const lineNo = index + 1;

    if (/^\s*```/.test(line)) {
      flushParagraph();
      inFence = !inFence;
      return;
    }
    if (inFence) return;

    if (isTableRow(line)) {
      flushParagraph();
      if (!inTable) {
        tableCount += 1;
        inTable = true;
        breakHere();
      }
      return;
    }
    inTable = false;

    if (isListItem(line)) {
      flushParagraph();
      if (!inList) {
        listCount += 1;
        inList = true;
        breakHere();
      }
      /* Liste maddelerinin kelimeleri de sayılıyor; yoksa madde madde
         yazılmış bir yazı "çok kısa" görünürdü. */
      words += countWords(line);
      return;
    }
    inList = false;

    if (isQuote(line) || isBoxFence(line)) {
      flushParagraph();
      breakHere();
      return;
    }

    const heading = /^(#{2,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      headings.push({ level: heading[1].length, text: heading[2].trim(), line: lineNo });
      /* Başlık da bir görsel kırılmadır — okuyucunun gözü orada dinlenir. */
      breakHere();
      return;
    }

    if (!line.trim()) {
      flushParagraph();
      return;
    }

    if (paragraph.length === 0) paragraphLine = lineNo;
    paragraph.push(line.trim());
  });

  flushParagraph();
  longestDryRun = Math.max(longestDryRun, dryRun);

  const images = [...markdown.matchAll(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g)].map(
    ([, alt, src]) => ({ alt: alt.trim(), src }),
  );
  if (images.length > 0) breakHere();

  const links = [...markdown.matchAll(/(!?)\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g)]
    .filter(([, bang]) => bang !== "!")
    .map(([, , text, href]) => ({ text: text.trim(), href }));

  return { headings, paragraphs, tableCount, listCount, images, links, longestDryRun, words };
}

/* -------------------------------------------------------------------------
 * CÜMLE BÖLME
 * Türkçe için kabaca: nokta/ünlem/soru + boşluk + büyük harf. Kısaltmalar
 * ("vb.", "Dr.") yanlış bölünebilir — bu bir UYARI üretici olduğu için
 * kabul edilebilir bir hata payı. Sayılar ("1.500") bölünmez çünkü noktadan
 * sonra rakam geliyor.
 * ----------------------------------------------------------------------- */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=["“(«]?[A-ZÇĞİÖŞÜ])/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/* -------------------------------------------------------------------------- */

export interface EditorialContext {
  type: string;
  title: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  excerpt: string;
  focusKeyword: string;
  coverAlt: string;
  tldr: string;
  faqCount: number;
}

/** Faz 2 §3.6: marka eki dahil 50-60 karakter hedefleniyor. */
export const BRAND_SUFFIX = " | akademITU";

export function renderedTitle(seoTitle: string, title: string): string {
  const base = seoTitle || title;
  return base.length + BRAND_SUFFIX.length <= 60 ? base + BRAND_SUFFIX : base;
}

const MAX_SENTENCE_WORDS = 30;
const MAX_PARAGRAPH_SENTENCES = 4;
const MAX_DRY_RUN_WORDS = 300;
/** Faz 2 §3.4: TL;DR ilk 60 kelimede cevabı vermeli. */
const MAX_TLDR_WORDS = 60;

export function checkEditorial(
  ctx: EditorialContext,
  body: string,
  diag: Diagnostics,
): BodyAnalysis {
  const analysis = analyzeBody(body);
  const archetype = ARCHETYPES[ctx.type];

  /* --- YASAK İFADELER: hukuki risk, bu yüzden hata --- */
  const haystack = `${ctx.title} ${ctx.excerpt} ${ctx.tldr} ${body}`;
  for (const { pattern, why } of BANNED_CLAIMS) {
    const hit = pattern.exec(haystack);
    if (hit) {
      diag.error(`Taahhüt içeren ifade (${why}): "${hit[0].trim()}". Garanti/kesin sonuç vaadi yayınlanamaz.`);
    }
  }

  if (!archetype) return analysis;

  /* --- UZUNLUK --- */
  if (archetype.min > 0) {
    if (analysis.words < archetype.min) {
      diag.warn(`${archetype.label} için ${analysis.words} kelime kısa; hedef ${archetype.min}-${archetype.max}.`, "type");
    } else if (analysis.words > archetype.max) {
      diag.warn(`${archetype.label} için ${analysis.words} kelime uzun; hedef ${archetype.min}-${archetype.max}.`, "type");
    }
  }

  /* --- TÜRE ÖZGÜ ZORUNLU ÖGELER --- */
  if (archetype.needsTable && analysis.tableCount === 0) {
    diag.warn(`${archetype.label} türünün merkezinde bir tablo olmalı; yazıda hiç tablo yok.`, "type");
  }
  if (archetype.needsExample && !analysis.headings.some((h) => /örnek|vaka|uygulama/i.test(h.text))) {
    diag.warn(`${archetype.label} türü somut bir örnek bölümü ister ("## Örnek: ..." gibi bir H2 yok).`, "type");
  }
  if (archetype.needsSource && !/ÖSYM|MEB|kaynak/i.test(body)) {
    diag.warn("Veri yazısında sayısal veriler kaynaklandırılmalı (ÖSYM/MEB ya da kendi analizinizi belirtin).", "type");
  }
  if (archetype.faqMin > 0 && ctx.faqCount < archetype.faqMin) {
    diag.warn(`${archetype.label} için ${archetype.faqMin} SSS önerilir; şu an ${ctx.faqCount}.`, "faq");
  }

  /* --- BAŞLIK YAPISI (Faz 2 §3.3) --- */
  if (analysis.headings.length === 0) {
    diag.warn("Yazıda hiç H2 yok; uzun metin başlıksız okunmuyor.");
  }

  let previous = 2;
  for (const heading of analysis.headings) {
    if (heading.level > previous + 1) {
      diag.error(
        `Başlık seviyesi atlanıyor: H${previous} sonrası H${heading.level} ("${heading.text}"). Araya H${previous + 1} girmeli.`,
      );
    }
    previous = heading.level;
  }

  const questionHeadings = analysis.headings.filter((h) => h.level === 2 && h.text.trim().endsWith("?"));
  if (analysis.headings.some((h) => h.level === 2) && questionHeadings.length < 2) {
    diag.warn(
      `Soru formunda ${questionHeadings.length} H2 var; en az 2 öneriliyor (insanlar soru arıyor, modeller soru-cevap bloğu alıntılıyor).`,
    );
  }

  /* --- YAPILANDIRILMIŞ İÇERİK (Faz 2 §4) --- */
  if (analysis.tableCount === 0 && analysis.listCount === 0) {
    diag.warn("Yazıda hiç tablo veya liste yok; en az bir yapılandırılmış blok öneriliyor.");
  }

  /* --- OKUNABİLİRLİK (Faz 2 §3.2) --- */
  if (analysis.longestDryRun > MAX_DRY_RUN_WORDS) {
    diag.warn(
      `Görsel kırılma olmadan ${analysis.longestDryRun} kelime akıyor; her ~300 kelimede tablo/liste/kutu/görsel öneriliyor.`,
    );
  }

  let longSentences = 0;
  let longParagraphs = 0;
  for (const paragraph of analysis.paragraphs) {
    const sentences = splitSentences(paragraph.text);
    if (sentences.length > MAX_PARAGRAPH_SENTENCES) longParagraphs += 1;
    for (const sentence of sentences) {
      if (countWords(sentence) > MAX_SENTENCE_WORDS) longSentences += 1;
    }
  }
  if (longSentences > 0) {
    diag.warn(`${longSentences} cümle ${MAX_SENTENCE_WORDS} kelimeyi aşıyor; bölmek okunurluğu artırır.`);
  }
  if (longParagraphs > 0) {
    diag.warn(`${longParagraphs} paragraf ${MAX_PARAGRAPH_SENTENCES} cümleden uzun; mobilde dev blok okunmuyor.`);
  }

  /* --- TL;DR (Faz 2 §3.4) --- */
  const tldrWords = countWords(ctx.tldr);
  if (tldrWords > MAX_TLDR_WORDS) {
    diag.warn(`TL;DR ${tldrWords} kelime; ${MAX_TLDR_WORDS} kelimeyi aşınca "kısa cevap" olmaktan çıkıyor.`, "tldr");
  }
  if (ctx.tldr && /bu yazıda|ele alacağız|inceleyeceğiz|değineceğiz|anlatacağız/i.test(ctx.tldr)) {
    diag.warn(
      'TL;DR neyi anlatacağını değil, CEVABI vermeli. ("Bu yazıda ... ele alacağız" yerine doğrudan cevap.)',
      "tldr",
    );
  }

  /* --- ANCHOR METİNLERİ (Faz 2 §3.8) --- */
  for (const link of analysis.links) {
    if (isWeakAnchor(link.text)) {
      diag.warn(`Açıklayıcı olmayan anchor metni: "${link.text}" -> ${link.href}`);
    }
  }

  /* --- GÖRSEL DOSYA ADLARI (Faz 2 §3.9) --- */
  for (const image of analysis.images) {
    const file = image.src.split("/").pop() ?? "";
    const base = file.replace(/\.[a-z0-9]+$/i, "");
    if (base && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(base)) {
      diag.warn(`Görsel dosya adı slug biçiminde olmalı: "${file}" -> "${slugify(base)}"`);
    }
  }

  /*
   * --- ODAK KELİME: ALTI YER (Faz 2 §3.5) ---
   * Altısı da burada, tek yerde. Yoğunluk hesabı YAPILMIYOR: aynı kelimeyi
   * yirmi kez tekrarlamak sıralamaya bir şey katmıyor, okumayı bozuyor.
   * Aranan şey kelimenin doğru altı noktada bulunması.
   *
   * Karşılaştırma asciiFold üzerinden: "Dağılımı" ile "dagilimi" aynı sayılsın
   * diye. toLocaleLowerCase("tr") yerine bunu kullanmanın sebebi, yazarın
   * anahtar kelimeyi Türkçe karakterle, slug'ı ise ASCII yazması.
   */
  if (ctx.focusKeyword) {
    const keyword = asciiFold(ctx.focusKeyword);
    const keywordSlug = slugify(ctx.focusKeyword);

    if (!asciiFold(ctx.title).includes(keyword)) {
      diag.warn(`Odak kelime ("${ctx.focusKeyword}") başlıkta geçmiyor.`, "focusKeyword");
    }

    /* İlk 100 kelime: TL;DR kutusu da yazının başı sayılıyor, çünkü sayfada
       H1'den hemen sonra geliyor. */
    const opening = asciiFold(`${ctx.tldr} ${body}`).split(/\s+/).slice(0, 120).join(" ");
    if (!opening.includes(keyword)) {
      diag.warn("Odak kelime ilk 100 kelimede geçmiyor.", "focusKeyword");
    }

    if (!analysis.headings.some((h) => h.level === 2 && asciiFold(h.text).includes(keyword))) {
      diag.warn("Odak kelime hiçbir H2'de geçmiyor.", "focusKeyword");
    }

    if (!ctx.slug.includes(keywordSlug)) {
      diag.warn(`Odak kelime slug'da geçmiyor (slug: "${ctx.slug}", beklenen parça: "${keywordSlug}").`, "focusKeyword");
    }

    const meta = asciiFold(ctx.seoDescription || ctx.excerpt);
    if (!meta.includes(keyword)) {
      diag.warn("Odak kelime meta açıklamada geçmiyor.", "seoDescription");
    }

    if (ctx.coverAlt && !asciiFold(ctx.coverAlt).includes(keyword)) {
      diag.warn("Odak kelime kapak görselinin alt metninde geçmiyor.", "coverAlt");
    }
  } else {
    diag.warn("`focusKeyword` boş — odak kelime kontrolleri çalıştırılamadı.", "focusKeyword");
  }

  /* --- BAŞLIK UZUNLUĞU (Faz 2 §3.6) --- */
  const full = renderedTitle(ctx.seoTitle, ctx.title);
  if (full.length > 60) {
    diag.warn(
      `Sekmede/SERP'te görünecek başlık ${full.length} karakter: "${full}". 60 karakteri aşan kısım kırpılır.`,
      "seoTitle",
    );
  }

  return analysis;
}
