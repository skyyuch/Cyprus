import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, type PluginOption} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';
import {callLlm} from './functions/_lib/anthropic';

// Dev-only proxy that mirrors the Cloudflare Pages Function at /api/agent, so
// `npm run dev` exercises the exact same forwarding core. The ANTHROPIC_API_KEY
// is read from .env on the server side and never reaches the browser bundle.
function devAgentProxy(apiKey: string | undefined, model: string | undefined): PluginOption {
  return {
    name: 'dev-agent-proxy',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/agent', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({error: 'Method not allowed. Use POST.'}));
          return;
        }
        let raw = '';
        req.on('data', (chunk) => {
          raw += chunk;
        });
        req.on('end', async () => {
          let body: unknown;
          try {
            body = JSON.parse(raw || '{}');
          } catch {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({error: 'Invalid JSON body.'}));
            return;
          }
          const result = await callLlm(body as never, apiKey, model || undefined);
          res.statusCode = result.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result.body));
        });
      });
    },
  };
}

export default defineConfig(({mode}) => {
  // Load all env vars (no VITE_ prefix filter) for server-side use only.
  const env = loadEnv(mode, process.cwd(), '');
  const llmKey = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  const llmModel = env.ANTHROPIC_MODEL || process.env.ANTHROPIC_MODEL;

  return {
    plugins: [
      react(),
      tailwindcss(),
      devAgentProxy(llmKey, llmModel),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['xsyphon-logo.png', 'xsyphon.vcf'],
        manifest: {
          name: 'xSyphon — Institutional Liquidity',
          short_name: 'xSyphon',
          description: 'AI-driven institutional liquidity. Live at iFX EXPO Cyprus 2026, Booth 76.',
          theme_color: '#040608',
          background_color: '#040608',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          icons: [{src: '/xsyphon-logo.png', sizes: '1024x300', type: 'image/png', purpose: 'any'}],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,woff,woff2}'],
          // Cache Google Fonts at runtime so the kiosk works offline after first load.
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts',
                expiration: {maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365},
                cacheableResponse: {statuses: [0, 200]},
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
