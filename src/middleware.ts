import { defineMiddleware } from 'astro:middleware';
import { getDB, getSessionUser } from './lib/db';
import { getSettings } from './lib/settings';
import { listServices } from './lib/services';
import { listPosts } from './lib/posts';
import { findRedirect, recordHit } from './lib/redirects';
import { SESSION_COOKIE } from './lib/auth';

const PUBLIC_ADMIN_PATHS = new Set(['/admin/login']);

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

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

  if (!pathname.startsWith('/admin')) {
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
