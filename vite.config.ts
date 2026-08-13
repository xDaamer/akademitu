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
    },
  };
});
