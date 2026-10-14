/**
 * POST /admin/api/portfolio-publicar — põe no ar o Portfólio enviado (JSON
 * { version, pageCount, ratio }) depois de conferir que TODOS os arquivos
 * chegaram ao R2; ou volta ao original com { restore: true }. Até aqui o site
 * não mudou nada.
 */
import type { APIRoute } from 'astro';
import { getDB, writeAuditLog } from '../../../lib/db';
import { getBucket } from '../../../lib/media';
import { updateSetting } from '../../../lib/settings';
import {
  DEFAULT_PORTFOLIO_FILES,
  MAX_PAGES,
  PDF_NAME,
  VERSION_RE,
  normalizePortfolioFiles,
  versionKey,
} from '../../../lib/portfolio-files';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return json({ error: 'Não autenticado.' }, 401);

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ error: 'Pedido inválido.' }, 422);

  const db = getDB();
  const audit = (target: string) =>
    writeAuditLog(db, {
      userId: locals.user?.id,
      userName: locals.user?.name ?? '',
      action: 'settings.update',
      target,
      ip: request.headers.get('cf-connecting-ip') ?? '',
    });

  if (body.restore === true) {
    await updateSetting(db, 'portfolio', DEFAULT_PORTFOLIO_FILES, locals.user.id);
    await audit('Portfólio: voltou ao original');
    return json({ ok: true });
  }

  const version = String(body.version ?? '');
  const pageCount = Number(body.pageCount);
  if (!VERSION_RE.test(version) || !Number.isInteger(pageCount) || pageCount < 1 || pageCount > MAX_PAGES) {
    return json({ error: 'Dados do Portfólio inválidos.' }, 422);
  }

  // Confere cada arquivo antes de trocar: nunca deixa o site apontando para algo que falta.
  const bucket = getBucket();
  const names = [PDF_NAME];
  for (let n = 1; n <= pageCount; n++) names.push(`pagina-${n}.webp`, `zoom-${n}.webp`);
  const heads = await Promise.all(names.map((name) => bucket.head(versionKey(version, name))));
  const missing = names.filter((_, i) => !heads[i]);
  if (missing.length > 0) {
    return json({ error: `Faltaram arquivos (${missing.length}). Nada foi alterado no site; envie de novo.` }, 422);
  }

  const settings = normalizePortfolioFiles({ version, pageCount, ratio: body.ratio });
  await updateSetting(db, 'portfolio', settings, locals.user.id);
  await audit(`Portfólio: novo PDF publicado (${pageCount} páginas)`);
  return json({ ok: true });
};
