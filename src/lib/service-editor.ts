/**
 * Aparência/layout de UM serviço individual (/servicos/[slug]), gravada na
 * coluna anulável `services.editor_json` (ver migrations/0004_services_
 * editor_json.sql). Nunca duplica conteúdo — nome, resumo, hero, intro,
 * blocks, deliverables, audience, imagem, SEO e status continuam
 * exclusivamente nas colunas/`content_json` de `services` (ver
 * src/lib/services.ts). Este arquivo só guarda o que o Editor Visual
 * desenha por cima: cores, fundo de seção, ordem/visibilidade, posições
 * livres e elementos sobrepostos.
 *
 * Hierarquia de Aparência: Global (settings.theme) → página principal de
 * Serviços (`ServicosContent.pageStyle`, ver documents.ts) → este serviço
 * (`pageStyle` abaixo) → seção deste serviço (`sectionStyles[chave]`).
 * Cada nível é esparso — campo vazio herda o nível acima; nada aqui
 * materializa um valor herdado, só a diferença.
 */
import type { D1Database } from './cf-types';
import {
  normalizeOverlays,
  normalizePageStyle,
  normalizeLayouts,
  EMPTY_PAGE_STYLE,
} from './pages';
import type { SectionStyle, PageStyle, LayoutPair, Overlay } from './pages';

const EMPTY_STYLE: SectionStyle = {
  bg: '',
  text: '',
  image: '',
  overlay: '',
  minHeight: '',
  paddingY: '',
};

/**
 * Mesmas 4 seções de src/pages/servicos/[slug].astro (hero fica fora — é
 * fixo, igual a Quem Somos/Serviços — e "outros serviços" também fica fora:
 * é navegação, não conteúdo deste serviço).
 */
export const SERVICE_SECTION_KEYS = ['highlights', 'content', 'form', 'others'] as const;
export type ServiceSectionKey = (typeof SERVICE_SECTION_KEYS)[number];

/** Versão do formato de `editor_json` — permite evoluir o formato sem quebrar registros antigos. */
export const SERVICE_EDITOR_VERSION = 1 as const;

export interface ServiceEditorContent {
  v: typeof SERVICE_EDITOR_VERSION;
  pageStyle: PageStyle;
  sectionStyles: Record<ServiceSectionKey, SectionStyle>;
  sectionOrder: ServiceSectionKey[];
  hiddenSections: ServiceSectionKey[];
  layouts: Record<string, LayoutPair>;
  overlays: Overlay[];
}

export const EMPTY_SERVICE_EDITOR_CONTENT: ServiceEditorContent = {
  v: SERVICE_EDITOR_VERSION,
  pageStyle: { ...EMPTY_PAGE_STYLE },
  sectionStyles: {
    highlights: { ...EMPTY_STYLE },
    content: { ...EMPTY_STYLE },
    form: { ...EMPTY_STYLE },
    others: { ...EMPTY_STYLE },
  },
  sectionOrder: [...SERVICE_SECTION_KEYS],
  hiddenSections: [],
  layouts: {},
  overlays: [],
};

/** Tamanho máximo do JSON gravado — mesma ordem de grandeza do conteúdo de uma página inteira. */
const MAX_JSON_LENGTH = 200_000;

function normalizeSectionKeys(
  value: unknown,
  fallback: ServiceSectionKey[]
): ServiceSectionKey[] {
  if (!Array.isArray(value)) return fallback;
  const seen = new Set<ServiceSectionKey>();
  for (const item of value) {
    if (
      typeof item === 'string' &&
      (SERVICE_SECTION_KEYS as readonly string[]).includes(item)
    ) {
      seen.add(item as ServiceSectionKey);
    }
  }
  for (const key of SERVICE_SECTION_KEYS) {
    if (!seen.has(key) && fallback.includes(key)) seen.add(key);
  }
  return [...seen];
}

/**
 * Nunca confia na estrutura do JSON recebido (nem do banco, nem do POST do
 * navegador): todo campo é reconstruído nome a nome a partir do valor bruto,
 * então uma chave inesperada — incluindo `__proto__`/`constructor` — nunca
 * chega a ser copiada para o objeto final, e uma versão desconhecida ou um
 * formato irreconhecível caem no padrão 100% herdado em vez de travar a
 * página ou propagar um valor não validado.
 */
export function normalizeServiceEditorContent(raw: unknown): ServiceEditorContent {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_SERVICE_EDITOR_CONTENT };
  const stored = raw as Record<string, unknown>;

  if (stored.v !== SERVICE_EDITOR_VERSION) return { ...EMPTY_SERVICE_EDITOR_CONTENT };

  return {
    v: SERVICE_EDITOR_VERSION,
    pageStyle: normalizePageStyle(stored.pageStyle),
    sectionStyles: {
      ...EMPTY_SERVICE_EDITOR_CONTENT.sectionStyles,
      ...Object.fromEntries(
        Object.entries((stored.sectionStyles ?? {}) as Record<string, unknown>)
          .filter(([key]) => (SERVICE_SECTION_KEYS as readonly string[]).includes(key))
          .map(([key, value]) => [key, { ...EMPTY_STYLE, ...normalizeSectionStyle(value) }])
      ),
    } as Record<ServiceSectionKey, SectionStyle>,
    sectionOrder: normalizeSectionKeys(stored.sectionOrder, [...SERVICE_SECTION_KEYS]),
    hiddenSections: normalizeSectionKeys(stored.hiddenSections, []),
    layouts: normalizeLayouts(stored.layouts),
    overlays: normalizeOverlays(stored.overlays, SERVICE_SECTION_KEYS),
  };
}

const HEX = /^#[0-9a-fA-F]{6}$/;

function normalizeSectionStyle(value: unknown): SectionStyle {
  const raw = (value ?? {}) as Record<string, unknown>;
  const hex = (v: unknown) => (typeof v === 'string' && HEX.test(v) ? v : '');
  // String vazia significa "não configurado / herda" — nunca vira "0". Só uma
  // string NÃO vazia e numericamente válida é normalizada; qualquer outra
  // coisa (incluindo vazio) volta como '', igual ao padrão das demais páginas
  // (ver clampPx em src/lib/pages.ts, que só resolve o número no momento de
  // gerar o CSS, nunca ao gravar).
  const num = (v: unknown, max: number) => {
    if (typeof v !== 'string' || v === '') return '';
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= max ? String(Math.round(n)) : '';
  };
  return {
    bg: hex(raw.bg),
    text: hex(raw.text),
    image:
      typeof raw.image === 'string' && /^(\/[\w\-./]*|https:\/\/[\w\-./?=&%]+)$/.test(raw.image)
        ? raw.image
        : '',
    overlay: num(raw.overlay, 100),
    minHeight: num(raw.minHeight, 2000),
    paddingY: num(raw.paddingY, 300),
  };
}

interface ServiceEditorRow {
  editor_json: string | null;
}

/** Serviço com `editor_json = NULL` (nunca personalizado) cai direto no padrão — sem herdar sobras de outro serviço. */
export async function getServiceEditorContent(
  db: D1Database,
  serviceId: number
): Promise<ServiceEditorContent> {
  try {
    const row = await db
      .prepare('SELECT editor_json FROM services WHERE id = ?1 AND deleted_at IS NULL')
      .bind(serviceId)
      .first<ServiceEditorRow>();
    if (!row || row.editor_json == null) return { ...EMPTY_SERVICE_EDITOR_CONTENT };

    const parsed = JSON.parse(row.editor_json) as unknown;
    return normalizeServiceEditorContent(parsed);
  } catch {
    return { ...EMPTY_SERVICE_EDITOR_CONTENT };
  }
}

/**
 * Grava só a coluna `editor_json` — nunca nome, slug, status ou qualquer
 * outra coluna de conteúdo. É o que garante que o Editor Visual não pode,
 * por construção, sobrescrever o que pertence ao CRUD tradicional.
 */
export async function updateServiceEditorContent(
  db: D1Database,
  serviceId: number,
  content: ServiceEditorContent
): Promise<boolean> {
  const json = JSON.stringify(content);
  if (json.length > MAX_JSON_LENGTH) return false;

  await db
    .prepare('UPDATE services SET editor_json = ?1 WHERE id = ?2 AND deleted_at IS NULL')
    .bind(json, serviceId)
    .run();
  return true;
}

/**
 * Aparência efetiva do serviço para a hierarquia página-de-Serviços →
 * serviço: mescla esparsa, o valor do serviço vence quando preenchido. Não
 * materializa nada — quem chama decide o que fazer com o resultado (ex.:
 * `pageStyleOverride` para o `<head>`), o registro do serviço continua
 * guardando só a própria diferença.
 */
export function resolveServicePageStyle(moldura: PageStyle, service: PageStyle): PageStyle {
  return {
    brandColor: service.brandColor || moldura.brandColor,
    accentColor: service.accentColor || moldura.accentColor,
    backgroundColor: service.backgroundColor || moldura.backgroundColor,
    headingColor: service.headingColor || moldura.headingColor,
  };
}
