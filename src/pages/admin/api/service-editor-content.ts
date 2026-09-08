/**
 * Gravação das edições do Editor Visual de UM serviço individual
 * (/servicos/[slug]). Duas gravações sempre separadas, nunca uma cópia da
 * outra:
 *
 *  - Operações de CONTEÚDO (`set`/`reorder`/`duplicate`/`remove`) alteram um
 *    documento montado a partir das colunas reais de `services` e são
 *    salvas por `updateServiceById` — a MESMA função usada pelo CRUD
 *    tradicional (`/admin/servicos/[slug]`). O Editor Visual nunca grava
 *    conteúdo em `editor_json`.
 *  - Operações de APARÊNCIA/LAYOUT (`sections`/`layout`/`overlay-*`/
 *    `page-style`) alteram só `editor_json`, via `updateServiceEditorContent`
 *    — nunca tocam em nome, resumo, hero, intro, imagem, SEO ou status.
 */
import type { APIRoute } from 'astro';
import { getDB, writeAuditLog } from '../../../lib/db';
import { getServiceById, updateServiceById } from '../../../lib/services';
import type { ServiceUpdate, ServiceHighlight, ServiceBlock } from '../../../lib/services';
import {
  getServiceEditorContent,
  updateServiceEditorContent,
  normalizeServiceEditorContent,
  SERVICE_SECTION_KEYS,
} from '../../../lib/service-editor';
import {
  normalizeLayout,
  normalizeOverlays,
  normalizePageStyle,
  EMPTY_LAYOUT,
} from '../../../lib/pages';
import { setByPath, reorderAtPath, duplicateAtPath, removeAtPath } from '../../../lib/editable';
import { safeHref } from '../../../lib/urls';
import {
  migrateServiceItemIds,
  generateItemId,
  REPEATABLE_LISTS,
} from '../../../lib/service-item-ids';

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

/**
 * Campos do serviço editáveis inline na tela (o resto continua só no CRUD).
 * `highlights`/`blocks` continuam em `content_json` — nunca copiados para
 * `editor_json`; só a posição/estilo deles (via `layouts`, indexado pelo
 * mesmo caminho `highlights.N.*`) fica no editor_json.
 */
interface ServiceDoc {
  heroTitle: string;
  heroLead: string;
  image: string;
  imageAlt: string;
  icon: string;
  whatsappMessage: string;
  intro: string[];
  deliverables: string[];
  audience: string[];
  highlights: ServiceHighlight[];
  blocks: ServiceBlock[];
}

function toDoc(existing: NonNullable<Awaited<ReturnType<typeof getServiceById>>>): ServiceDoc {
  return {
    heroTitle: existing.heroTitle,
    heroLead: existing.heroLead,
    image: existing.image,
    imageAlt: existing.imageAlt,
    icon: existing.icon,
    whatsappMessage: existing.whatsappMessage,
    intro: [...existing.intro],
    deliverables: [...existing.deliverables],
    audience: [...existing.audience],
    highlights: existing.highlights.map((item) => ({ ...item })),
    blocks: existing.blocks.map((block) => ({
      ...block,
      items: block.items ? [...block.items] : block.items,
    })),
  };
}

function isDevice(value: unknown): value is 'desktop' | 'mobile' {
  return value === 'desktop' || value === 'mobile';
}

function isSectionKeyList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'string' && (SERVICE_SECTION_KEYS as readonly string[]).includes(item)
    )
  );
}

const CONTENT_OPS = new Set(['set', 'reorder', 'duplicate', 'remove']);

function applyContentOp(doc: Record<string, unknown>, operation: EditOp): boolean {
  switch (operation.op) {
    case 'set':
      if (typeof operation.path !== 'string' || typeof operation.value !== 'string')
        return false;
      if (operation.value.length > 20_000) return false;
      return setByPath(doc, operation.path, operation.value);
    case 'reorder':
      return reorderAtPath(
        doc,
        operation.path as string,
        operation.from as number,
        operation.to as number
      );
    case 'duplicate':
      return duplicateAtPath(doc, operation.path as string, operation.index as number);
    case 'remove':
      return removeAtPath(doc, operation.path as string, operation.index as number);
    default:
      return false;
  }
}

function applyLayoutOp(
  content: ReturnType<typeof normalizeServiceEditorContent>,
  operation: EditOp
): boolean {
  const overlays = content.overlays;

  switch (operation.op) {
    case 'sections': {
      let changed = false;
      if (operation.order !== undefined) {
        if (!isSectionKeyList(operation.order)) return false;
        const unique = [...new Set(operation.order as string[])];
        if (unique.length !== SERVICE_SECTION_KEYS.length) return false;
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

      const [normalized] = normalizeOverlays([raw], SERVICE_SECTION_KEYS);
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
      if (!(SERVICE_SECTION_KEYS as readonly string[]).includes(operation.to as string))
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

    default:
      return false;
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Não autenticado.' }), { status: 401 });
  }

  let payload: { serviceId?: unknown; ops?: unknown };
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido.' }), { status: 400 });
  }

  const serviceId = Number(payload.serviceId);
  if (!Number.isInteger(serviceId) || serviceId <= 0) {
    return new Response(JSON.stringify({ error: 'Serviço inválido.' }), { status: 400 });
  }

  const ops = payload.ops;
  if (!Array.isArray(ops) || ops.length === 0 || ops.length > 200) {
    return new Response(JSON.stringify({ error: 'Nenhuma operação válida.' }), { status: 422 });
  }

  const db = getDB();
  const existing = await getServiceById(db, serviceId);
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Serviço não encontrado.' }), { status: 404 });
  }

  const doc = toDoc(existing) as unknown as Record<string, unknown>;
  const layoutContent = await getServiceEditorContent(db, serviceId);

  // Rede de segurança: o GET de /admin/editor/servicos/[id] já materializa
  // ids estáveis e migra chaves de layout por índice (ver src/lib/service-
  // item-ids.ts) — isto aqui é defensivo, para qualquer chamada direta a
  // esta API sem ter passado por lá. Idempotente: sem nada pendente, não
  // marca nada como alterado.
  const migration = migrateServiceItemIds(
    doc.highlights as ServiceHighlight[],
    doc.blocks as ServiceBlock[],
    layoutContent
  );
  doc.highlights = migration.highlights;
  doc.blocks = migration.blocks;
  layoutContent.layouts = migration.layouts;

  let docChanged = migration.changed;
  let layoutChanged = migration.changed;
  const rejected: number[] = [];

  ops.forEach((rawOp, index) => {
    const operation = rawOp as EditOp;
    if (typeof operation?.op !== 'string') {
      rejected.push(index);
      return;
    }

    if (CONTENT_OPS.has(operation.op)) {
      const path = operation.path as string;
      const isRepeatableList = (REPEATABLE_LISTS as readonly string[]).includes(path);

      // Captura o id do item ANTES de removê-lo — depois de removeAtPath
      // não existe mais nada para ler.
      let removedId: string | undefined;
      if (operation.op === 'remove' && isRepeatableList) {
        const list = doc[path] as { id?: string }[] | undefined;
        removedId = list?.[operation.index as number]?.id;
      }

      if (!applyContentOp(doc, operation)) {
        rejected.push(index);
        return;
      }
      docChanged = true;

      // Duplicar precisa de um id PRÓPRIO — nunca o mesmo do original, ou a
      // cópia herdaria (e colidiria com) a posição/estilo dele no editor_json.
      if (operation.op === 'duplicate' && isRepeatableList) {
        const list = doc[path] as { id?: string }[];
        const copy = list[(operation.index as number) + 1];
        if (copy) copy.id = generateItemId();
      }

      // Excluir remove também qualquer layout salvo para aquele item — nunca
      // deixa um metadado órfão em editor_json apontando para nada.
      if (removedId) {
        const prefix = `${path}.${removedId}.`;
        for (const key of Object.keys(layoutContent.layouts)) {
          if (key.startsWith(prefix)) {
            delete layoutContent.layouts[key];
            layoutChanged = true;
          }
        }
      }
      return;
    }

    if (applyLayoutOp(layoutContent, operation)) layoutChanged = true;
    else rejected.push(index);
  });

  if (rejected.length === ops.length && !migration.changed) {
    return new Response(
      JSON.stringify({ error: 'Nenhuma alteração pôde ser aplicada.', rejected }),
      {
        status: 422,
      }
    );
  }

  if (docChanged) {
    const patch: ServiceUpdate = {
      name: existing.name,
      icon: String(doc.icon),
      shortName: existing.shortName,
      summary: existing.summary,
      heroTitle: String(doc.heroTitle),
      heroLead: String(doc.heroLead),
      image: String(doc.image),
      imageAlt: String(doc.imageAlt),
      whatsappMessage: String(doc.whatsappMessage),
      seoTitle: existing.seo.title,
      seoDescription: existing.seo.description,
      status: existing.status,
      featured: existing.featured,
      intro: doc.intro as string[],
      deliverables: doc.deliverables as string[],
      audience: doc.audience as string[],
      highlights: doc.highlights as ServiceHighlight[],
      blocks: doc.blocks as ServiceBlock[],
    };
    await updateServiceById(db, serviceId, patch, existing);
  }

  if (layoutChanged) {
    const ok = await updateServiceEditorContent(db, serviceId, layoutContent);
    if (!ok) {
      return new Response(
        JSON.stringify({ error: 'Aparência excede o tamanho máximo permitido.' }),
        {
          status: 413,
        }
      );
    }
  }

  await writeAuditLog(db, {
    userId: locals.user.id,
    userName: locals.user.name,
    action: 'page.edit',
    target: `Serviço #${serviceId}: ${existing.name} (${ops.length - rejected.length} alteração(ões))`,
    ip: request.headers.get('cf-connecting-ip') ?? '',
  });

  return new Response(JSON.stringify({ ok: true, rejected }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
