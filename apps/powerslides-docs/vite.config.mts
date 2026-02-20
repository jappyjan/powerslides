/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command }) => {
  const base = command === 'build' ? '/powerslides/' : '/';
  return {
    root: import.meta.dirname,
    base,
    cacheDir: '../../node_modules/.vite/apps/powerslides-docs',
    server: {
      port: 4200,
      host: 'localhost',
    },
    preview: {
      port: 4200,
      host: 'localhost',
    },
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'html-base',
        transformIndexHtml(html) {
          return html.replace(/<base href="[^"]*" \/>/, `<base href="${base}" />`);
        },
      },
    ],
    build: {
      outDir: './dist',
      emptyOutDir: true,
      reportCompressedSize: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
  };
});
