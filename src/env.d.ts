/// <reference types="astro/client" />

// Bindings do Worker (D1, futuramente R2) — acessados via o módulo nativo
// `cloudflare:workers`, não mais por `Astro.locals.runtime.env` (removido
// nesta versão do adapter). Ver src/lib/db.ts.
type CloudflareEnv = {
  DB: import('./lib/cf-types').D1Database;
  MEDIA: import('./lib/cf-types').R2Bucket;
  PUBLIC_SITE_URL: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  SESSION_SECRET?: string;
  /**
   * Quando definida, todo visitante anônimo/público é redirecionado (301)
   * para esta URL — usado para desativar um site antigo sem apagar seus
   * dados: `/admin/*` continua funcionando normalmente aqui, só as rotas
   * públicas saem. Defina só no wrangler.jsonc do site que deve ficar
   * inativo (nunca no site novo nem localmente).
   */
  INACTIVE_REDIRECT_URL?: string;
};

declare module 'cloudflare:workers' {
  export const env: CloudflareEnv;
}

declare namespace App {
  interface Locals {
    user?: {
      id: number;
      name: string;
      email: string;
      role: 'admin' | 'editor';
    };
    settings: import('./lib/settings').SiteSettings;
    services: import('./lib/services').Service[];
    posts: import('./lib/posts').Post[];
    /** Menu publico carregado uma unica vez por requisicao pelo middleware. */
    navigation: import('./lib/navigation').NavigationItem[];
    /** Página aberta dentro do editor visual por um usuário autenticado. */
    editMode?: boolean;
  }
}
