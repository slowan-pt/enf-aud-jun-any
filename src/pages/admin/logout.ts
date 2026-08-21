import type { APIRoute } from 'astro';
import { getDB, deleteSession, writeAuditLog } from '../../lib/db';
import { SESSION_COOKIE } from '../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, locals, redirect }) => {
  const sessionId = cookies.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    const db = getDB();
    await deleteSession(db, sessionId);
    if (locals.user) {
      await writeAuditLog(db, {
        userId: locals.user.id,
        userName: locals.user.name,
        action: 'logout',
        target: 'Sessão administrativa',
      });
    }
  }
  cookies.delete(SESSION_COOKIE, { path: '/' });
  return redirect('/admin/login');
};
