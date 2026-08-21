// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

// ETAPA 2: output "server" no adapter Cloudflare. As páginas públicas continuam
// pré-renderizadas (export const prerender = true em cada uma) — só /admin/* e
// as rotas de API rodam no Worker, com D1/R2/Turnstile.
export default defineConfig({
  site: 'https://essencialsaudeauditoria.com.br',
  output: 'server',
  // Sessão administrativa é gerida à mão (D1 + cookie assinado, ver
  // src/lib/auth.ts) — desliga o recurso Astro.session (que exigiria um
  // binding KV extra sem necessidade aqui).
  session: false,
  adapter: cloudflare({
    imageService: 'compile',
  }),
  trailingSlash: 'ignore',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/admin'),
    }),
  ],
});
