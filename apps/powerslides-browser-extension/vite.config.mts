/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';

const manifest = {
  manifest_version: 3,
  name: 'Slide Control Extension',
  version: '0.1.0',
  action: {
    default_popup: 'index.html',
  },
  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['https://docs.google.com/presentation/d/*'],
      js: ['src/content.ts'],
    },
  ],
  permissions: ['activeTab', 'storage', 'scripting'],
  host_permissions: ['http://localhost:4200/*', 'http://127.0.0.1:4200/*'],
  web_accessible_resources: [
    {
      resources: ['getViewerDataScript.js'],
      matches: ['https://docs.google.com/*'],
    },
  ],
};

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../node_modules/.vite/powerslides-browser-extension',
  server: {
    port: 4200,
    host: true,
  },
  preview: {
    port: 4200,
    host: true,
  },
  plugins: [react(), crx({ manifest })],
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [],
  // },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
}));
