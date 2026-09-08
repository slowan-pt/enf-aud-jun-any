/**
 * Identidade estável para itens repetíveis de um serviço individual
 * (`highlights`, `blocks`) — a peça que faltava para reordenar, duplicar e
 * excluir sem trocar a posição/estilo salva de um item para outro.
 *
 * Decisão: id opcional persistido DENTRO de cada item do `content_json`
 * (não um mapa separado). Vantagens sobre um mapa de ids no `editor_json`:
 * o id viaja com o item automaticamente em qualquer reorder/duplicate
 * (são o mesmo `splice`/`structuredClone` já usados por `editable.ts`),
 * então nenhuma lógica extra de sincronização é necessária no dia a dia —
 * só na migração pontual de chaves de layout antigas, feita aqui.
 *
 * Nunca deriva id de título/texto/hash (editar o conteúdo não pode mudar a
 * identidade) e nunca gera um novo a cada carregamento (só quando o campo
 * `id` está realmente ausente).
 */
import type { ServiceHighlight, ServiceBlock } from './services';
import type { ServiceEditorContent } from './service-editor';

export const REPEATABLE_LISTS = ['highlights', 'blocks'] as const;
export type RepeatableList = (typeof REPEATABLE_LISTS)[number];

interface HasId {
  id?: string;
}

/** Alfanumérico apenas — precisa passar no EDIT_PATH usado para validar chaves de layout. */
export function generateItemId(): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return 'h' + random.slice(0, 12);
}

/** Garante `id` em cada item; nunca regenera o de um item que já tem. */
export function ensureItemIds<T extends HasId>(items: T[]): { items: T[]; changed: boolean } {
  let changed = false;
  const out = items.map((item) => {
    if (item.id) return item;
    changed = true;
    return { ...item, id: generateItemId() };
  });
  return { items: out, changed };
}

const LEGACY_LAYOUT_KEY = /^(highlights|blocks)\.(\d+)\.(.+)$/;

/**
 * Migra chaves de layout gravadas por índice ("highlights.0.title") para a
 * chave estável por id ("highlights.<id>.title"), usando a posição ATUAL dos
 * itens — precisa rodar ANTES de aplicar qualquer operação da requisição
 * corrente (reorder/duplicate/remove), nunca depois. Idempotente: uma chave
 * já migrada não bate no regex (id nunca é só dígitos) e passa intacta.
 */
export function migrateLayoutKeysToIds(
  layouts: ServiceEditorContent['layouts'],
  highlights: HasId[],
  blocks: HasId[]
): { layouts: ServiceEditorContent['layouts']; changed: boolean } {
  let changed = false;
  const lists: Record<RepeatableList, HasId[]> = { highlights, blocks };
  const out: ServiceEditorContent['layouts'] = {};

  for (const [key, value] of Object.entries(layouts)) {
    const match = LEGACY_LAYOUT_KEY.exec(key);
    if (!match) {
      out[key] = value;
      continue;
    }
    const [, list, indexStr, field] = match as unknown as [
      string,
      RepeatableList,
      string,
      string,
    ];
    const index = Number(indexStr);
    const id = lists[list][index]?.id;
    if (!id) {
      // Item não existe mais nessa posição, ou ainda sem id (não deveria
      // acontecer se ensureItemIds já rodou antes) — mantém a chave como
      // estava em vez de descartar silenciosamente um dado do usuário.
      out[key] = value;
      continue;
    }
    out[`${list}.${id}.${field}`] = value;
    changed = true;
  }

  return { layouts: out, changed };
}

export interface ServiceItemIdMigration {
  highlights: ServiceHighlight[];
  blocks: ServiceBlock[];
  layouts: ServiceEditorContent['layouts'];
  changed: boolean;
}

/**
 * Ponto único: garante ids estáveis em highlights/blocks e migra qualquer
 * layout salvo por índice para a chave por id correspondente. Só devolve os
 * dados em memória — quem chama decide se e como persistir (sempre as DUAS
 * colunas juntas, numa única instrução SQL — ver
 * `updateServiceContentAndEditorJson` em src/lib/services.ts).
 */
export function migrateServiceItemIds(
  highlights: ServiceHighlight[],
  blocks: ServiceBlock[],
  editorContent: ServiceEditorContent
): ServiceItemIdMigration {
  const h = ensureItemIds(highlights);
  const b = ensureItemIds(blocks);
  const l = migrateLayoutKeysToIds(editorContent.layouts, h.items, b.items);

  return {
    highlights: h.items,
    blocks: b.items,
    layouts: l.layouts,
    changed: h.changed || b.changed || l.changed,
  };
}
