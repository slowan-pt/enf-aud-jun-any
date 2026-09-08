/**
 * Gravação das edições do Editor Visual para páginas migradas do formato
 * fixo do Astro para o banco (fora a Home, que continua em page-content.ts —
 * sem tocar num caminho já testado). Mesmo princípio: o cliente manda
 * operações pontuais, o servidor relê o conteúdo atual e aplica por cima.
 *
 * `slug` escolhe qual página: hoje só 'quem-somos'. Adicionar a próxima
 * página migrada é acrescentar um `case` no `loadAdapter` — não um arquivo
 * novo, porque o formato da operação (set/overlay/estilo de seção/de página)
 * é o mesmo em qualquer documento genérico.
 */
import type { APIRoute } from 'astro';
import { getDB, writeAuditLog } from '../../../lib/db';
import {
  normalizeLayout,
  normalizeOverlays,
  normalizePageStyle,
  EMPTY_LAYOUT,
} from '../../../lib/pages';
import {
  getQuemSomosContent,
  updateQuemSomosContent,
  QUEM_SOMOS_SECTION_KEYS,
  getContatoContent,
  updateContatoContent,
  CONTATO_SECTION_KEYS,
  getServicosContent,
  updateServicosContent,
  SERVICOS_SECTION_KEYS,
  getPoliticaContent,
  updatePoliticaContent,
  POLITICA_SECTION_KEYS,
} from '../../../lib/documents';
import type { QuemSomosContent } from '../../../lib/documents';
import { setByPath, reorderAtPath, duplicateAtPath, removeAtPath } from '../../../lib/editable';
import { safeHref } from '../../../lib/urls';

export const prerender = false;

const SHAPE_HEX = /^#[0-9a-fA-F]{6}$/;
function clampInt(value: unknown, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

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
interface LayoutOp {
  op: 'layout';
  path: string;
  device: 'desktop' | 'mobile';
  layout: unknown;
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
interface OverlayShapeStyleOp {
  op: 'overlay-shape-style';
  id: string;
  text?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  href?: string;
  linkTarget?: string;
}
interface OverlayMoveSectionOp {
  op: 'overlay-move-section';
  id: string;
  to: string;
  device: 'desktop' | 'mobile';
  layout: unknown;
}
/** Só existe aqui — a Home ainda guarda a paleta global, não uma por página. */
interface PageStyleOp {
  op: 'page-style';
  value: unknown;
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
  | OverlayRemoveOp
  | OverlayShapeStyleOp
  | OverlayMoveSectionOp
  | PageStyleOp;

const EDIT_PATH = /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$/;
const OVERLAY_ID = /^[a-z0-9-]{1,40}$/;

function isDevice(value: unknown): value is 'desktop' | 'mobile' {
  return value === 'desktop' || value === 'mobile';
}

function isSectionKeyList(value: unknown, sectionKeys: readonly string[]): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'string' && sectionKeys.includes(item))
  );
}

/** Igual à Home em espírito (ver page-content.ts) — parametrizado pela lista de seções desta página. */
function applyOp(
  content: Record<string, unknown>,
  operation: EditOp,
  sectionKeys: readonly string[]
): boolean {
  const overlays = content.overlays as import('../../../lib/pages').Overlay[];

  switch (operation.op) {
    case 'set':
      if (typeof operation.path !== 'string' || typeof operation.value !== 'string')
        return false;
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
        if (!isSectionKeyList(operation.order, sectionKeys)) return false;
        const unique = [...new Set(operation.order)];
        if (unique.length !== sectionKeys.length) return false;
        content.sectionOrder = unique;
        changed = true;
      }
      if (operation.hidden !== undefined) {
        if (!isSectionKeyList(operation.hidden, sectionKeys)) return false;
        content.hiddenSections = [...new Set(operation.hidden)];
        changed = true;
      }
      return changed;
    }

    case 'layout': {
      if (!EDIT_PATH.test(operation.path) || !isDevice(operation.device)) return false;
      const layouts = content.layouts as Record<
        string,
        import('../../../lib/pages').LayoutPair
      >;

      if (operation.clear) {
        if (operation.device === 'mobile') {
          const pair = layouts[operation.path];
          if (!pair) return false;
          pair.mobile = null;
        } else {
          delete layouts[operation.path];
        }
        return true;
      }

      const current = layouts[operation.path] ?? { desktop: { ...EMPTY_LAYOUT }, mobile: null };
      current[operation.device] = normalizeLayout(operation.layout);
      layouts[operation.path] = current;
      return true;
    }

    case 'overlay-add': {
      if (overlays.length >= 100) return false;
      const raw = (operation.overlay ?? {}) as Record<string, unknown>;
      const id = String(raw.id ?? '');
      if (!OVERLAY_ID.test(id)) return false;
      if (overlays.some((item) => item.id === id)) return false;

      const [normalized] = normalizeOverlays([raw], sectionKeys);
      if (!normalized || normalized.id !== id) return false;

      overlays.push(normalized);
      return true;
    }

    case 'overlay-layout': {
      if (!OVERLAY_ID.test(operation.id) || !isDevice(operation.device)) return false;
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
      if (!OVERLAY_ID.test(operation.id)) return false;
      const overlay = overlays.find((item) => item.id === operation.id);
      if (!overlay) return false;
      if (typeof operation.content === 'string')
        overlay.content = operation.content.slice(0, 2000);
      if (typeof operation.alt === 'string') overlay.alt = operation.alt.slice(0, 300);
      return true;
    }

    case 'overlay-remove': {
      if (!OVERLAY_ID.test(operation.id)) return false;
      const before = overlays.length;
      content.overlays = overlays.filter((item) => item.id !== operation.id);
      return (content.overlays as unknown[]).length < before;
    }

    case 'overlay-shape-style': {
      if (!OVERLAY_ID.test(operation.id)) return false;
      const overlay = overlays.find((item) => item.id === operation.id);
      if (!overlay || overlay.kind !== 'shape') return false;

      if (typeof operation.text === 'string') overlay.text = operation.text.slice(0, 300);
      if (typeof operation.fill === 'string') {
        overlay.fill = SHAPE_HEX.test(operation.fill) ? operation.fill : '';
      }
      if (typeof operation.stroke === 'string') {
        overlay.stroke = SHAPE_HEX.test(operation.stroke) ? operation.stroke : '';
      }
      if (operation.strokeWidth !== undefined) {
        overlay.strokeWidth = clampInt(operation.strokeWidth, 0, 20);
      }
      if (typeof operation.href === 'string') overlay.href = safeHref(operation.href);
      if (typeof operation.linkTarget === 'string') {
        overlay.linkTarget = operation.linkTarget === '_blank' ? '_blank' : '_self';
      }
      return true;
    }

    case 'overlay-move-section': {
      if (!OVERLAY_ID.test(operation.id) || !isDevice(operation.device)) return false;
      if (!sectionKeys.includes(operation.to)) return false;
      const overlay = overlays.find((item) => item.id === operation.id);
      if (!overlay) return false;

      overlay.section = operation.to;
      overlay[operation.device] = normalizeLayout(operation.layout);
      return true;
    }

    case 'page-style':
      content.pageStyle = normalizePageStyle(operation.value);
      return true;

    default:
      return false;
  }
}

interface DocumentAdapter {
  sectionKeys: readonly string[];
  getContent: (db: ReturnType<typeof getDB>) => Promise<Record<string, unknown>>;
  updateContent: (
    db: ReturnType<typeof getDB>,
    content: QuemSomosContent,
    userId?: number
  ) => Promise<void>;
  label: string;
}

/** Próxima página migrada entra aqui, com sua própria lista de seções. */
const ADAPTERS: Record<string, DocumentAdapter> = {
  'quem-somos': {
    sectionKeys: QUEM_SOMOS_SECTION_KEYS,
    getContent: getQuemSomosContent as unknown as DocumentAdapter['getContent'],
    updateContent: updateQuemSomosContent,
    label: 'Quem Somos',
  },
  contato: {
    sectionKeys: CONTATO_SECTION_KEYS,
    getContent: getContatoContent as unknown as DocumentAdapter['getContent'],
    updateContent: updateContatoContent as unknown as DocumentAdapter['updateContent'],
    label: 'Contato',
  },
  servicos: {
    sectionKeys: SERVICOS_SECTION_KEYS,
    getContent: getServicosContent as unknown as DocumentAdapter['getContent'],
    updateContent: updateServicosContent as unknown as DocumentAdapter['updateContent'],
    label: 'Serviços',
  },
  politica: {
    sectionKeys: POLITICA_SECTION_KEYS,
    getContent: getPoliticaContent as unknown as DocumentAdapter['getContent'],
    updateContent: updatePoliticaContent as unknown as DocumentAdapter['updateContent'],
    label: 'Política de Privacidade',
  },
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Não autenticado.' }), { status: 401 });
  }

  let payload: { slug?: unknown; ops?: unknown };
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido.' }), { status: 400 });
  }

  const adapter = typeof payload.slug === 'string' ? ADAPTERS[payload.slug] : undefined;
  if (!adapter) {
    return new Response(JSON.stringify({ error: 'Página desconhecida.' }), { status: 404 });
  }

  const ops = payload.ops;
  if (!Array.isArray(ops) || ops.length === 0 || ops.length > 200) {
    return new Response(JSON.stringify({ error: 'Nenhuma operação válida.' }), { status: 422 });
  }

  const db = getDB();
  const current = await adapter.getContent(db);
  const { updatedAt: _ignored, ...content } = current;

  const rejected: number[] = [];
  ops.forEach((operation, index) => {
    if (!applyOp(content, operation as EditOp, adapter.sectionKeys)) rejected.push(index);
  });

  if (rejected.length === ops.length) {
    return new Response(
      JSON.stringify({ error: 'Nenhuma alteração pôde ser aplicada.', rejected }),
      { status: 422 }
    );
  }

  await adapter.updateContent(db, content as unknown as QuemSomosContent, locals.user.id);

  await writeAuditLog(db, {
    userId: locals.user.id,
    userName: locals.user.name,
    action: 'page.edit',
    target: `${adapter.label} (${ops.length - rejected.length} alteração(ões))`,
    ip: request.headers.get('cf-connecting-ip') ?? '',
  });

  return new Response(JSON.stringify({ ok: true, rejected }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
