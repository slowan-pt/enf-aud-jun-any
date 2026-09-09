import { defineMiddleware } from 'astro:middleware';
import { getDB, getSessionUser } from './lib/db';
import { getSettings } from './lib/settings';
import { listServices } from './lib/services';
import { listPosts } from './lib/posts';
import { findRedirect, recordHit } from './lib/redirects';
import { SESSION_COOKIE } from './lib/auth';
import { listNavigation } from './lib/navigation';

const PUBLIC_ADMIN_PATHS = new Set(['/admin/login']);

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Defesa central contra CSRF em todas as mutacoes do painel, inclusive APIs
  // JSON. Navegadores modernos enviam Origin em POST; Sec-Fetch-Site cobre a
  // navegacao quando extensoes de privacidade removem esse cabecalho.
  if (pathname.startsWith('/admin') && context.request.method !== 'GET') {
    const origin = context.request.headers.get('origin');
    const fetchSite = context.request.headers.get('sec-fetch-site');
    if (
      (origin !== null && origin !== context.url.origin) ||
      (origin === null && fetchSite !== 'same-origin' && fetchSite !== 'none')
    ) {
      return new Response('Origem da requisicao recusada.', { status: 403 });
    }
  }

  // Configurações administráveis (empresa, WhatsApp, redes sociais) ficam
  // disponíveis em Astro.locals.settings em toda página/rota — site público
  // e painel — sem precisar repassar por props em cada componente.
  const db = getDB();

  if (!pathname.startsWith('/admin')) {
    const redirect = await findRedirect(db, pathname);
    if (redirect) {
      await recordHit(db, redirect.id);
      return context.redirect(redirect.to, redirect.code);
    }
  }

  context.locals.settings = await getSettings(db);
  context.locals.services = await listServices(db);
  context.locals.posts = await listPosts(db);
  context.locals.navigation = await listNavigation(db);

  if (!pathname.startsWith('/admin')) {
    // O editor visual abre a própria página pública dentro de um iframe. Só
    // nesse caso resolvemos a sessão aqui, para a página saber que deve
    // carregar o runtime de edição. Visitante comum nunca passa por isso.
    if (context.url.searchParams.get('__edit') === '1') {
      const editSessionId = context.cookies.get(SESSION_COOKIE)?.value;
      if (editSessionId) {
        const editUser = await getSessionUser(db, editSessionId);
        if (editUser) {
          context.locals.user = editUser;
          // Rótulos e tipos usados só pelo editor saem do HTML de quem visita o
          // site. Isto é limpeza, não controle de acesso: quem autoriza e valida
          // continua sendo o servidor, em cada requisição.
          context.locals.editMode = true;
        }
      }
    }
    return next();
  }

  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
    return next();
  }

  const sessionId = context.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId) {
    return context.redirect(`/admin/login?next=${encodeURIComponent(pathname)}`);
  }

  const user = await getSessionUser(db, sessionId);
  if (!user) {
    context.cookies.delete(SESSION_COOKIE, { path: '/' });
    return context.redirect(`/admin/login?next=${encodeURIComponent(pathname)}`);
  }

  context.locals.user = user;
  return next();
});
