// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

// ETAPA 2: output "server" no adapter Cloudflare. As páginas públicas continuam
// pré-renderizadas (export const prerender = true em cada uma) — só /admin/* e
// as rotas de API rodam no Worker, com D1/R2/Turnstile.
//
// ISOLATED_TEST_DB_DIR (só definida por `npm run dev:isolated`, nunca por
// `npm run dev` normal): aponta o D1/R2/KV local para uma cópia separada em
// vez de `.wrangler/state` — ver scripts/isolated-test-db.mjs. Sem essa
// variável, o comportamento é exatamente o de sempre.
const isolatedDbDir = process.env.ISOLATED_TEST_DB_DIR;

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? 'https://essencialsaudeauditoria.com.br',
  output: 'server',
  // Sessão administrativa é gerida à mão (D1 + cookie assinado, ver
  // src/lib/auth.ts) — desliga o recurso Astro.session (que exigiria um
  // binding KV extra sem necessidade aqui).
  session: false,
  adapter: cloudflare({
    imageService: 'compile',
    persistState: isolatedDbDir ? { path: isolatedDbDir } : undefined,
  }),
  trailingSlash: 'ignore',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/admin'),
    }),
  ],
});
