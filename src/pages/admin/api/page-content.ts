/**
 * Gravação das edições feitas no editor visual.
 *
 * O cliente envia operações (não o documento inteiro): cada uma descreve uma
 * mudança pontual. O servidor relê o conteúdo atual do D1, aplica as operações
 * e grava. Assim duas abas editando a mesma página não sobrescrevem uma à outra
 * por inteiro — só o campo realmente alterado muda.
 */
import type { APIRoute } from 'astro';
import { getDB, writeAuditLog } from '../../../lib/db';
import { getHomeContent, updateHomeContent, HOME_SECTION_KEYS } from '../../../lib/pages';
import type { HomeContent, HomeSectionKey } from '../../../lib/pages';
import { setByPath, reorderAtPath, duplicateAtPath, removeAtPath } from '../../../lib/editable';

export const prerender = false;

interface SetOp {
  op: 'set';
  path: string;
  value: string;
}
interface ReorderOp {
  op: 'reorder';
  path: string;
  from: number;
  to: number;
}
interface ItemOp {
  op: 'duplicate' | 'remove';
  path: string;
  index: number;
}
interface SectionsOp {
  op: 'sections';
  order?: unknown;
  hidden?: unknown;
}
type EditOp = SetOp | ReorderOp | ItemOp | SectionsOp;

function isSectionKeyList(value: unknown): value is HomeSectionKey[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'string' && (HOME_SECTION_KEYS as readonly string[]).includes(item)
    )
  );
}

function applyOp(content: HomeContent, operation: EditOp): boolean {
  switch (operation.op) {
    case 'set':
      if (typeof operation.path !== 'string' || typeof operation.value !== 'string') {
        return false;
      }
      // Um texto de página não tem motivo para passar de 20k caracteres; o
      // limite evita que um cliente com defeito encha a linha do banco.
      if (operation.value.length > 20_000) return false;
      return setByPath(content, operation.path, operation.value);

    case 'reorder':
      return reorderAtPath(content, operation.path, operation.from, operation.to);

    case 'duplicate':
      return duplicateAtPath(content, operation.path, operation.index);

    case 'remove':
      return removeAtPath(content, operation.path, operation.index);

    case 'sections': {
      let changed = false;
      if (operation.order !== undefined) {
        if (!isSectionKeyList(operation.order)) return false;
        const unique = [...new Set(operation.order)];
        if (unique.length !== HOME_SECTION_KEYS.length) return false;
        content.sectionOrder = unique;
        changed = true;
      }
      if (operation.hidden !== undefined) {
        if (!isSectionKeyList(operation.hidden)) return false;
        content.hiddenSections = [...new Set(operation.hidden)];
        changed = true;
      }
      return changed;
    }

    default:
      return false;
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Não autenticado.' }), { status: 401 });
  }

  let payload: { ops?: unknown };
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido.' }), { status: 400 });
  }

  const ops = payload.ops;
  if (!Array.isArray(ops) || ops.length === 0 || ops.length > 200) {
    return new Response(JSON.stringify({ error: 'Nenhuma operação válida.' }), { status: 422 });
  }

  const db = getDB();
  const current = await getHomeContent(db);
  const { updatedAt: _ignored, ...content } = current;

  const rejected: number[] = [];
  ops.forEach((operation, index) => {
    if (!applyOp(content as HomeContent, operation as EditOp)) rejected.push(index);
  });

  if (rejected.length === ops.length) {
    return new Response(
      JSON.stringify({ error: 'Nenhuma alteração pôde ser aplicada.', rejected }),
      { status: 422 }
    );
  }

  await updateHomeContent(db, content as HomeContent, locals.user.id);

  await writeAuditLog(db, {
    userId: locals.user.id,
    userName: locals.user.name,
    action: 'page.edit',
    target: `Home (${ops.length - rejected.length} alteração(ões))`,
    ip: request.headers.get('cf-connecting-ip') ?? '',
  });

  return new Response(JSON.stringify({ ok: true, rejected }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
