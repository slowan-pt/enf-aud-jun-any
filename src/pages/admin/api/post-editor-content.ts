/**
 * Gravação das edições do Editor Visual de UMA matéria individual
 * (/conteudos/[slug]). Diferente de Serviços: uma matéria não tem lista de
 * conteúdo editável por canvas (título, resumo, corpo e SEO continuam só no
 * formulário de Conteúdo → Matérias) — aqui só existem operações de
 * APARÊNCIA/LAYOUT (`sections`/`layout`/`overlay-*`/`page-style`/
 * `image-style`), sempre em `posts.editor_json`, nunca nas colunas de
 * conteúdo.
 */
import type { APIRoute } from 'astro';
import { getDB, writeAuditLog } from '../../../lib/db';
import { getPostById } from '../../../lib/posts';
import {
  getPostEditorContent,
  updatePostEditorContent,
  normalizePostImageStyle,
  POST_SECTION_KEYS,
} from '../../../lib/post-editor';
import type { PostEditorContent } from '../../../lib/post-editor';
import {
  normalizeLayout,
  normalizeOverlays,
  normalizePageStyle,
  EMPTY_LAYOUT,
} from '../../../lib/pages';
import { safeHref } from '../../../lib/urls';

export const prerender = false;

const SHAPE_HEX = /^#[0-9a-fA-F]{6}$/;
function clampInt(value: unknown, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

type EditOp = Record<string, unknown> & { op: string };

const EDIT_PATH = /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$/;
const OVERLAY_ID = /^[a-z0-9-]{1,40}$/;

function isDevice(value: unknown): value is 'desktop' | 'mobile' {
  return value === 'desktop' || value === 'mobile';
}

function isSectionKeyList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'string' && (POST_SECTION_KEYS as readonly string[]).includes(item)
    )
  );
}

function applyLayoutOp(content: PostEditorContent, operation: EditOp): boolean {
  const overlays = content.overlays;

  switch (operation.op) {
    case 'sections': {
      let changed = false;
      if (operation.order !== undefined) {
        if (!isSectionKeyList(operation.order)) return false;
        const unique = [...new Set(operation.order as string[])];
        if (unique.length !== POST_SECTION_KEYS.length) return false;
        content.sectionOrder = unique as typeof content.sectionOrder;
        changed = true;
      }
      if (operation.hidden !== undefined) {
        if (!isSectionKeyList(operation.hidden)) return false;
        content.hiddenSections = [
          ...new Set(operation.hidden as string[]),
        ] as typeof content.hiddenSections;
        changed = true;
      }
      return changed;
    }

    case 'layout': {
      if (
        typeof operation.path !== 'string' ||
        !EDIT_PATH.test(operation.path) ||
        !isDevice(operation.device)
      ) {
        return false;
      }
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
      if (overlays.length >= 100) return false;
      const raw = (operation.overlay ?? {}) as Record<string, unknown>;
      const id = String(raw.id ?? '');
      if (!OVERLAY_ID.test(id)) return false;
      if (overlays.some((item) => item.id === id)) return false;

      const [normalized] = normalizeOverlays([raw], POST_SECTION_KEYS);
      if (!normalized || normalized.id !== id) return false;

      overlays.push(normalized);
      return true;
    }

    case 'overlay-layout': {
      if (!OVERLAY_ID.test(operation.id as string) || !isDevice(operation.device)) return false;
      const overlay = overlays.find((item) => item.id === operation.id);
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
      if (!OVERLAY_ID.test(operation.id as string)) return false;
      const overlay = overlays.find((item) => item.id === operation.id);
      if (!overlay) return false;
      if (typeof operation.content === 'string')
        overlay.content = operation.content.slice(0, 2000);
      if (typeof operation.alt === 'string') overlay.alt = operation.alt.slice(0, 300);
      return true;
    }

    case 'overlay-remove': {
      if (!OVERLAY_ID.test(operation.id as string)) return false;
      const before = overlays.length;
      content.overlays = overlays.filter((item) => item.id !== operation.id);
      return content.overlays.length < before;
    }

    case 'overlay-shape-style': {
      if (!OVERLAY_ID.test(operation.id as string)) return false;
      const overlay = overlays.find((item) => item.id === operation.id);
      if (!overlay || overlay.kind !== 'shape') return false;

      if (typeof operation.text === 'string') overlay.text = operation.text.slice(0, 300);
      if (typeof operation.fill === 'string')
        overlay.fill = SHAPE_HEX.test(operation.fill) ? operation.fill : '';
      if (typeof operation.stroke === 'string') {
        overlay.stroke = SHAPE_HEX.test(operation.stroke) ? operation.stroke : '';
      }
      if (operation.strokeWidth !== undefined)
        overlay.strokeWidth = clampInt(operation.strokeWidth, 0, 20);
      if (typeof operation.href === 'string') overlay.href = safeHref(operation.href);
      if (typeof operation.linkTarget === 'string') {
        overlay.linkTarget = operation.linkTarget === '_blank' ? '_blank' : '_self';
      }
      return true;
    }

    case 'overlay-move-section': {
      if (!OVERLAY_ID.test(operation.id as string) || !isDevice(operation.device)) return false;
      if (!(POST_SECTION_KEYS as readonly string[]).includes(operation.to as string))
        return false;
      const overlay = overlays.find((item) => item.id === operation.id);
      if (!overlay) return false;
      overlay.section = operation.to as string;
      overlay[operation.device] = normalizeLayout(operation.layout);
      return true;
    }

    case 'page-style':
      content.pageStyle = normalizePageStyle(operation.value);
      return true;

    case 'image-style':
      content.imageStyle = normalizePostImageStyle(operation.value);
      return true;

    default:
      return false;
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Não autenticado.' }), { status: 401 });
  }

  let payload: { postId?: unknown; ops?: unknown };
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido.' }), { status: 400 });
  }

  const postId = Number(payload.postId);
  if (!Number.isInteger(postId) || postId <= 0) {
    return new Response(JSON.stringify({ error: 'Matéria inválida.' }), { status: 400 });
  }

  const ops = payload.ops;
  if (!Array.isArray(ops) || ops.length === 0 || ops.length > 200) {
    return new Response(JSON.stringify({ error: 'Nenhuma operação válida.' }), { status: 422 });
  }

  const db = getDB();
  const existing = await getPostById(db, postId);
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Matéria não encontrada.' }), { status: 404 });
  }

  const content = await getPostEditorContent(db, postId);
  const rejected: number[] = [];

  ops.forEach((rawOp, index) => {
    const operation = rawOp as EditOp;
    if (typeof operation?.op !== 'string' || !applyLayoutOp(content, operation)) {
      rejected.push(index);
    }
  });

  if (rejected.length === ops.length) {
    return new Response(
      JSON.stringify({ error: 'Nenhuma alteração pôde ser aplicada.', rejected }),
      { status: 422 }
    );
  }

  const ok = await updatePostEditorContent(db, postId, content);
  if (!ok) {
    return new Response(
      JSON.stringify({ error: 'Aparência excede o tamanho máximo permitido.' }),
      {
        status: 413,
      }
    );
  }

  await writeAuditLog(db, {
    userId: locals.user.id,
    userName: locals.user.name,
    action: 'page.edit',
    target: `Matéria #${postId}: ${existing.title} (${ops.length - rejected.length} alteração(ões))`,
    ip: request.headers.get('cf-connecting-ip') ?? '',
  });

  return new Response(JSON.stringify({ ok: true, rejected }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
