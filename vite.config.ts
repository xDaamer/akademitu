import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import fs from 'fs';

// Load need.json for SEO metadata
const need = JSON.parse(fs.readFileSync('./need.json', 'utf-8'));

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Transform HTML with need.json data
      {
        name: 'seo-html-transform',
        transformIndexHtml: {
          order: 'pre',
          handler(html: string) {
            return html
              .replace(/{{site\.title}}/g, need.site.title)
              .replace(/{{site\.description}}/g, need.site.description)
              .replace(/{{site\.domain}}/g, need.site.domain)
              .replace(/{{site\.name}}/g, need.site.name)
              .replace(/{{contact\.phone}}/g, need.contact.phone)
              .replace(/{{site\.logoUrl}}/g, need.site.logoUrl);
          },
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      /*
       * İKİ HOST'LU KURULUMU YERELDE DENEMEK İÇİN.
       * ---------------------------------------------------------------------
       * Vite, DNS rebinding saldırılarına karşı Host başlığını denetler ve
       * tanımadığı bir host'tan gelen isteği reddeder ("Blocked request").
       * localhost dışında bir adla (ör. /etc/hosts'a eklenmiş
       * akademitu.local / portal.akademitu.local) çalıştırmak isteyen
       * geliştirici bu yüzden duvara toslar.
       *
       * Liste ELLE YAZILMIYOR: .env'deki VITE_MAIN_ORIGIN / VITE_PORTAL_ORIGIN
       * neyse o. Böylece izin verilen host ile uygulamanın kullandığı adres
       * birbirinden ayrı düşemez. Değişken yoksa liste boş kalır, yani
       * Vite'ın varsayılan (dar) davranışı korunur — üretimde bu blok zaten
       * hiç çalışmaz, dev sunucusuna aittir.
       */
      allowedHosts: [process.env.VITE_MAIN_ORIGIN, process.env.VITE_PORTAL_ORIGIN]
        .filter((value): value is string => Boolean(value))
        .map((origin) => {
          try {
            return new URL(origin).hostname;
          } catch {
            return '';
          }
        })
        .filter(Boolean),
    },
  };
});
