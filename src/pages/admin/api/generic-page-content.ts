import type { APIRoute } from 'astro';
import { getDB, writeAuditLog } from '../../../lib/db';
import {
  updateGenericPageVisualState,
  type GenericPageContent,
  type GenericPageEditor,
} from '../../../lib/generic-pages';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user)
    return new Response(JSON.stringify({ error: 'Nao autenticado.' }), { status: 401 });
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > 1_000_000)
    return new Response(JSON.stringify({ error: 'Conteudo muito grande.' }), { status: 413 });
  let payload: { id?: unknown; content?: unknown; editor?: unknown };
  try {
    const body = await request.text();
    if (body.length > 1_000_000)
      return new Response(JSON.stringify({ error: 'Conteudo muito grande.' }), { status: 413 });
    payload = JSON.parse(body) as typeof payload;
  } catch {
    return new Response(JSON.stringify({ error: 'JSON invalido.' }), { status: 400 });
  }
  const id = Number(payload.id);
  if (!Number.isInteger(id) || id <= 0 || !payload.content || !payload.editor)
    return new Response(JSON.stringify({ error: 'Dados invalidos.' }), { status: 422 });
  try {
    await updateGenericPageVisualState(
      getDB(),
      id,
      payload.content as GenericPageContent,
      payload.editor as GenericPageEditor,
      locals.user.id
    );
    await writeAuditLog(getDB(), {
      userId: locals.user.id,
      userName: locals.user.name,
      action: 'page.visual-edit',
      target: `Pagina #${id}`,
      ip: request.headers.get('cf-connecting-ip') ?? '',
    });
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Pagina nao encontrada.' }), { status: 404 });
  }
};
