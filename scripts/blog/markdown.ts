import MarkdownIt from "markdown-it";
import container from "markdown-it-container";
import { uniqueHeadingId } from "./slug.js";

/**
 * MARKDOWN -> HTML
 * ============================================================================
 * Build zamanında çalışır; tarayıcıya da Vercel fonksiyonuna da girmez.
 * Dolayısıyla burada üretilen HTML'in çalışma anında yeniden üretilmesi diye
 * bir şey yok — yazı bir kez derlenir, statik dosya olarak servis edilir.
 *
 * `html: false` — EN ÖNEMLİ AYAR.
 * Markdown içindeki ham HTML kaçırılır, yani `<script>` yazan biri ekrana
 * "&lt;script&gt;" basar. Bu, stored XSS sınıfını sanitizer'a bırakmak yerine
 * kaynağında ortadan kaldırıyor: temizlenecek bir HTML hiç oluşmuyor.
 * İçerik zaten depoda ve gözden geçirilerek giriyor; bu ikinci savunma.
 *
 * `linkify: false` — çıplak URL'leri otomatik linke çevirmiyoruz. Yazıda
 * geçen bir alan adı istemeden dışarı link olmamalı; link isteniyorsa açıkça
 * yazılır.
 */
const md = new MarkdownIt({
  html: false,
  linkify: false,
  typographer: false,
  breaks: false,
});

/*
 * BİLGİ KUTULARI
 * ::: ipucu / ::: uyari / ::: bilgi ... :::
 * Fence (```) yerine container kullanılıyor: fence içindeki metin düz metin
 * olarak kalır, container içindeki markdown işlenmeye devam eder — kutunun
 * içinde kalın yazı ve link kullanılabilsin diye.
 */
const BOXES: Record<string, string> = {
  ipucu: "İpucu",
  uyari: "Dikkat",
  bilgi: "Bilgi",
};

for (const [name, label] of Object.entries(BOXES)) {
  md.use(container, name, {
    render(tokens: any[], idx: number) {
      if (tokens[idx].nesting === 1) {
        return `<aside class="kutu kutu-${name}"><p class="kutu-baslik">${label}</p>\n`;
      }
      return "</aside>\n";
    },
  });
}

/*
 * DIŞ LİNKLER. Kendi yollarımız (/ ile başlayan) olduğu gibi kalır; dış
 * adreslere rel="noopener" ekleniyor. `noreferrer` bilinçli olarak YOK:
 * referrer bilgisi, link verdiğimiz sitenin bize geri dönmesini sağlayan
 * şey ve bir güvenlik riski oluşturmuyor (sayfa zaten herkese açık).
 */
const defaultLinkOpen =
  md.renderer.rules.link_open ??
  ((tokens: any, idx: number, options: any, _env: any, self: any) =>
    self.renderToken(tokens, idx, options));

md.renderer.rules.link_open = (tokens: any, idx: number, options: any, env: any, self: any) => {
  const href = tokens[idx].attrGet("href") ?? "";
  if (/^https?:\/\//i.test(href)) {
    tokens[idx].attrSet("target", "_blank");
    tokens[idx].attrSet("rel", "noopener");
  }
  return defaultLinkOpen(tokens, idx, options, env, self);
};

/* Tablolar yatayda taşabilir; mobilde sayfanın tamamını kaydırmasın diye
   kendi kaydırma kabına alınıyor. */
md.renderer.rules.table_open = () => '<div class="tablo-kabi">\n<table>\n';
md.renderer.rules.table_close = () => "</table>\n</div>\n";

export interface TocEntry {
  id: string;
  text: string;
  level: number;
}

export interface RenderedMarkdown {
  html: string;
  toc: TocEntry[];
}

/*
 * BAŞLIK ÇAPALARI. Token ağacına elle düğüm eklemek yerine renderer
 * kurallarını değiştiriyoruz: heading_open id'yi saklıyor, heading_close
 * kapanış etiketinden hemen önce "#" bağlantısını basıyor.
 *
 * Modül düzeyindeki `currentId` güvenli, çünkü render eş zamanlı ve tek
 * iş parçacıklı: bir başlığın açılışı ile kapanışı arasına başka bir
 * başlık giremiyor.
 */
let currentId = "";

md.renderer.rules.heading_open = (tokens: any, idx: number, options: any, _env: any, self: any) => {
  currentId = tokens[idx].attrGet("id") ?? "";
  return self.renderToken(tokens, idx, options);
};

md.renderer.rules.heading_close = (tokens: any, idx: number, options: any, _env: any, self: any) => {
  const anchor = currentId
    ? ` <a class="capa" href="#${currentId}" aria-label="Bu bölüme bağlantı">#</a>`
    : "";
  return anchor + self.renderToken(tokens, idx, options);
};

/** Başlık metnini düz metne indirger (TOC'ta ham HTML görünmesin diye). */
function plainText(token: any): string {
  return (token?.children ?? [])
    .filter((child: any) => child.type === "text" || child.type === "code_inline")
    .map((child: any) => child.content)
    .join("")
    .trim();
}

/**
 * Markdown'ı HTML'e çevirir ve içindekiler tablosunu üretir.
 *
 * Başlık id'leri uniqueHeadingId ile üretiliyor: iki farklı H2 aynı slug'a
 * düşerse ikincisine sayı ekleniyor, aksi halde içindekilerdeki linkler
 * yanlış yere giderdi.
 */
export function renderMarkdown(source: string): RenderedMarkdown {
  const tokens = md.parse(source, {});
  const toc: TocEntry[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token.type !== "heading_open") continue;

    const level = Number(token.tag.slice(1));
    const text = plainText(tokens[i + 1]);
    const id = uniqueHeadingId(text, seen);

    token.attrSet("id", id);

    /* İçindekilere yalnızca H2 ve H3 giriyor: daha derini listeyi
       okunmaz hâle getiriyor. */
    if (level === 2 || level === 3) toc.push({ id, text, level });
  }

  return { html: md.renderer.render(tokens, (md as any).options, {}), toc };
}

/** Kategori açıklaması, yazar biyografisi gibi kısa metinler için. */
export function renderInline(source: string): string {
  return md.render(source);
}
