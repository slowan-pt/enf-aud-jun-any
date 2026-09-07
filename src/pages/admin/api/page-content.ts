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
import {
  getHomeContent,
  updateHomeContent,
  normalizeLayout,
  HOME_SECTION_KEYS,
  EMPTY_LAYOUT,
} from '../../../lib/pages';
import type { HomeContent, HomeSectionKey, Overlay } from '../../../lib/pages';
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
/** Posição/estilo livre de um elemento existente, por tamanho de tela. */
interface LayoutOp {
  op: 'layout';
  path: string;
  device: 'desktop' | 'mobile';
  layout: unknown;
  /** Remove a configuração em vez de gravar (voltar ao natural). */
  clear?: boolean;
}
interface OverlayAddOp {
  op: 'overlay-add';
  overlay: unknown;
}
interface OverlayLayoutOp {
  op: 'overlay-layout';
  id: string;
  device: 'desktop' | 'mobile';
  layout: unknown;
  clear?: boolean;
}
interface OverlayContentOp {
  op: 'overlay-content';
  id: string;
  content?: string;
  alt?: string;
}
interface OverlayRemoveOp {
  op: 'overlay-remove';
  id: string;
}
type EditOp =
  | SetOp
  | ReorderOp
  | ItemOp
  | SectionsOp
  | LayoutOp
  | OverlayAddOp
  | OverlayLayoutOp
  | OverlayContentOp
  | OverlayRemoveOp;

const EDIT_PATH = /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$/;
const OVERLAY_ID = /^[a-z0-9-]{1,40}$/;

function isDevice(value: unknown): value is 'desktop' | 'mobile' {
  return value === 'desktop' || value === 'mobile';
}

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

    case 'layout': {
      if (!EDIT_PATH.test(operation.path) || !isDevice(operation.device)) return false;

      if (operation.clear) {
        if (operation.device === 'mobile') {
          const pair = content.layouts[operation.path];
          if (!pair) return false;
          pair.mobile = null;
        } else {
          delete content.layouts[operation.path];
        }
        return true;
      }

      const current = content.layouts[operation.path] ?? {
        desktop: { ...EMPTY_LAYOUT },
        mobile: null,
      };
      current[operation.device] = normalizeLayout(operation.layout);
      content.layouts[operation.path] = current;
      return true;
    }

    case 'overlay-add': {
      if (content.overlays.length >= 100) return false;
      const raw = (operation.overlay ?? {}) as Record<string, unknown>;
      const id = String(raw.id ?? '');
      const section = String(raw.section ?? '');
      const kind = String(raw.kind ?? '');

      if (!OVERLAY_ID.test(id)) return false;
      if (content.overlays.some((item) => item.id === id)) return false;
      if (!(HOME_SECTION_KEYS as readonly string[]).includes(section)) return false;
      if (kind !== 'text' && kind !== 'image' && kind !== 'icon') return false;

      content.overlays.push({
        id,
        section: section as HomeSectionKey,
        kind,
        content: String(raw.content ?? '').slice(0, 2000),
        alt: String(raw.alt ?? '').slice(0, 300),
        desktop: normalizeLayout(raw.desktop),
        mobile: raw.mobile ? normalizeLayout(raw.mobile) : null,
      } satisfies Overlay);
      return true;
    }

    case 'overlay-layout': {
      if (!OVERLAY_ID.test(operation.id) || !isDevice(operation.device)) return false;
      const overlay = content.overlays.find((item) => item.id === operation.id);
      if (!overlay) return false;

      if (operation.clear) {
        if (operation.device !== 'mobile') return false;
        overlay.mobile = null;
        return true;
      }
      overlay[operation.device] = normalizeLayout(operation.layout);
      return true;
    }

    case 'overlay-content': {
      if (!OVERLAY_ID.test(operation.id)) return false;
      const overlay = content.overlays.find((item) => item.id === operation.id);
      if (!overlay) return false;
      if (typeof operation.content === 'string') {
        overlay.content = operation.content.slice(0, 2000);
      }
      if (typeof operation.alt === 'string') overlay.alt = operation.alt.slice(0, 300);
      return true;
    }

    case 'overlay-remove': {
      if (!OVERLAY_ID.test(operation.id)) return false;
      const before = content.overlays.length;
      content.overlays = content.overlays.filter((item) => item.id !== operation.id);
      return content.overlays.length < before;
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
