/// <reference types='vitest' />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { crx } from '@crxjs/vite-plugin';

const DEFAULT_SERVER = 'wss://powerslides.apps.janjaap.de';

function getServerOrigin(env: Record<string, string>) {
  const base =
    env.VITE_WEBSOCKET_URL || process.env.VITE_WEBSOCKET_URL || DEFAULT_SERVER;
  try {
    const u = new URL(base.replace(/^ws/, 'http'));
    return `${u.protocol}//${u.host}`;
  } catch {
    return 'https://powerslides.apps.janjaap.de';
  }
}

function buildManifest(env: Record<string, string>) {
  const serverOrigin = getServerOrigin(env);
  return {
    manifest_version: 3,
    name: 'PowerSlides',
    version: '0.1.0',
    description:
      'Control Google Slides remotely. Pairs with the PowerSlides server to relay slide state and commands to the Even Realities app.',
    action: {
      default_popup: 'index.html',
      default_icon: {
        16: 'icons/icon16.png',
        48: 'icons/icon48.png',
        128: 'icons/icon128.png',
      },
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
    permissions: ['activeTab', 'storage', 'scripting', 'tabs'],
    host_permissions: [
      'http://localhost:4200/*',
      'http://127.0.0.1:4200/*',
      'https://docs.google.com/*',
      `${serverOrigin}/*`,
    ],
    web_accessible_resources: [
      {
        resources: ['getViewerDataScript.js'],
        matches: ['https://docs.google.com/*'],
      },
    ],
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, '');
  const manifest = buildManifest(env);
  return {
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
    plugins: [react(), tailwindcss(), crx({ manifest })],
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
