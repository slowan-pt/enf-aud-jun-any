/**
 * Gravação do estado do canvas de UM organograma/fluxograma
 * (/admin/organogramas/[id]). Só grava `diagrams.canvas_json` — nunca
 * qualquer outra tabela; o organograma é uma área livre, sem relação com o
 * conteúdo das páginas semânticas.
 */
import type { APIRoute } from 'astro';
import { getDB, writeAuditLog } from '../../../lib/db';
import { getDiagram, updateDiagramCanvas } from '../../../lib/diagrams';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Não autenticado.' }), { status: 401 });
  }

  let payload: { diagramId?: unknown; canvasJson?: unknown };
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido.' }), { status: 400 });
  }

  const diagramId = Number(payload.diagramId);
  if (!Number.isInteger(diagramId) || diagramId <= 0) {
    return new Response(JSON.stringify({ error: 'Organograma inválido.' }), { status: 400 });
  }
  if (typeof payload.canvasJson !== 'string') {
    return new Response(JSON.stringify({ error: 'Canvas inválido.' }), { status: 400 });
  }

  const db = getDB();
  const existing = await getDiagram(db, diagramId);
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Organograma não encontrado.' }), {
      status: 404,
    });
  }

  const ok = await updateDiagramCanvas(db, diagramId, payload.canvasJson, locals.user.id);
  if (!ok) {
    return new Response(
      JSON.stringify({ error: 'Organograma excede o tamanho máximo permitido.' }),
      {
        status: 413,
      }
    );
  }

  await writeAuditLog(db, {
    userId: locals.user.id,
    userName: locals.user.name,
    action: 'diagram.update',
    target: `Organograma #${diagramId}: ${existing.title}`,
    ip: request.headers.get('cf-connecting-ip') ?? '',
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
