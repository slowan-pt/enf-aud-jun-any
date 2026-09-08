/**
 * Aparência/layout de UMA matéria individual (/conteudos/[slug]), gravada na
 * coluna anulável `posts.editor_json` (ver migrations/0005_posts_editor_
 * json.sql). Nunca duplica conteúdo — título, resumo, corpo, capa, autor,
 * categoria, SEO e status continuam exclusivamente nas colunas/`body_json`
 * de `posts` (ver src/lib/posts.ts). Este arquivo só guarda o que o Editor
 * Visual desenha por cima: cores, fundo de seção, ordem/visibilidade,
 * posições livres, elementos sobrepostos e o ajuste visual da capa.
 *
 * Mesmo padrão de src/lib/service-editor.ts — a diferença é que uma matéria
 * não tem lista de conteúdo editável por canvas (título/corpo/SEO ficam só
 * no formulário de Conteúdo → Matérias), então não existem operações de
 * CONTEÚDO aqui, só de APARÊNCIA/LAYOUT.
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

/** Mesmas seções de src/pages/conteudos/[slug].astro — o cabeçalho fixo (título/meta/capa) fica fora. */
export const POST_SECTION_KEYS = ['body', 'related'] as const;
export type PostSectionKey = (typeof POST_SECTION_KEYS)[number];

/** Versão do formato de `editor_json` — permite evoluir o formato sem quebrar registros antigos. */
export const POST_EDITOR_VERSION = 1 as const;

/**
 * Ajuste visual da imagem de capa — SEMPRE aqui, nunca na fonte oficial: a
 * referência do arquivo e o texto alternativo continuam em `posts.cover_id`/
 * `cover_alt`, só cover/contain e posição são "decoração" sem coluna própria.
 */
export interface PostImageStyle {
  fit: 'cover' | 'contain';
  /** Posição horizontal do `object-position`, 0 a 100 (%). */
  posX: number;
  /** Posição vertical do `object-position`, 0 a 100 (%). */
  posY: number;
}

export const EMPTY_POST_IMAGE_STYLE: PostImageStyle = {
  fit: 'cover',
  posX: 50,
  posY: 50,
};

export function normalizePostImageStyle(value: unknown): PostImageStyle {
  const raw = (value ?? {}) as Record<string, unknown>;
  const fit = raw.fit === 'contain' ? 'contain' : 'cover';
  const pos = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 50;
  };
  return { fit, posX: pos(raw.posX), posY: pos(raw.posY) };
}

export interface PostEditorContent {
  v: typeof POST_EDITOR_VERSION;
  pageStyle: PageStyle;
  sectionStyles: Record<PostSectionKey, SectionStyle>;
  sectionOrder: PostSectionKey[];
  hiddenSections: PostSectionKey[];
  layouts: Record<string, LayoutPair>;
  overlays: Overlay[];
  imageStyle: PostImageStyle;
}

export const EMPTY_POST_EDITOR_CONTENT: PostEditorContent = {
  v: POST_EDITOR_VERSION,
  pageStyle: { ...EMPTY_PAGE_STYLE },
  sectionStyles: {
    body: { ...EMPTY_STYLE },
    related: { ...EMPTY_STYLE },
  },
  sectionOrder: [...POST_SECTION_KEYS],
  hiddenSections: [],
  layouts: {},
  overlays: [],
  imageStyle: { ...EMPTY_POST_IMAGE_STYLE },
};

/** Tamanho máximo do JSON gravado — mesma ordem de grandeza do conteúdo de uma página inteira. */
const MAX_JSON_LENGTH = 200_000;

function normalizeSectionKeys(value: unknown, fallback: PostSectionKey[]): PostSectionKey[] {
  if (!Array.isArray(value)) return fallback;
  const seen = new Set<PostSectionKey>();
  for (const item of value) {
    if (typeof item === 'string' && (POST_SECTION_KEYS as readonly string[]).includes(item)) {
      seen.add(item as PostSectionKey);
    }
  }
  for (const key of POST_SECTION_KEYS) {
    if (!seen.has(key) && fallback.includes(key)) seen.add(key);
  }
  return [...seen];
}

const HEX = /^#[0-9a-fA-F]{6}$/;

function normalizeSectionStyle(value: unknown): SectionStyle {
  const raw = (value ?? {}) as Record<string, unknown>;
  const hex = (v: unknown) => (typeof v === 'string' && HEX.test(v) ? v : '');
  // String vazia significa "não configurado / herda" — nunca vira "0" (ver o
  // mesmo cuidado em service-editor.ts / clampPx em pages.ts).
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

/**
 * Nunca confia na estrutura do JSON recebido (nem do banco, nem do POST do
 * navegador): todo campo é reconstruído nome a nome a partir do valor bruto,
 * então uma versão desconhecida ou um formato irreconhecível caem no padrão
 * 100% herdado em vez de travar a página ou propagar um valor não validado.
 */
export function normalizePostEditorContent(raw: unknown): PostEditorContent {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_POST_EDITOR_CONTENT };
  const stored = raw as Record<string, unknown>;

  if (stored.v !== POST_EDITOR_VERSION) return { ...EMPTY_POST_EDITOR_CONTENT };

  return {
    v: POST_EDITOR_VERSION,
    pageStyle: normalizePageStyle(stored.pageStyle),
    sectionStyles: {
      ...EMPTY_POST_EDITOR_CONTENT.sectionStyles,
      ...Object.fromEntries(
        Object.entries((stored.sectionStyles ?? {}) as Record<string, unknown>)
          .filter(([key]) => (POST_SECTION_KEYS as readonly string[]).includes(key))
          .map(([key, value]) => [key, { ...EMPTY_STYLE, ...normalizeSectionStyle(value) }])
      ),
    } as Record<PostSectionKey, SectionStyle>,
    sectionOrder: normalizeSectionKeys(stored.sectionOrder, [...POST_SECTION_KEYS]),
    hiddenSections: normalizeSectionKeys(stored.hiddenSections, []),
    layouts: normalizeLayouts(stored.layouts),
    overlays: normalizeOverlays(stored.overlays, POST_SECTION_KEYS),
    imageStyle: normalizePostImageStyle(stored.imageStyle),
  };
}

interface PostEditorRow {
  editor_json: string | null;
}

/** Matéria com `editor_json = NULL` (nunca personalizada) cai direto no padrão — sem herdar sobras de outra. */
export async function getPostEditorContent(
  db: D1Database,
  postId: number
): Promise<PostEditorContent> {
  try {
    const row = await db
      .prepare('SELECT editor_json FROM posts WHERE id = ?1 AND deleted_at IS NULL')
      .bind(postId)
      .first<PostEditorRow>();
    if (!row || row.editor_json == null) return { ...EMPTY_POST_EDITOR_CONTENT };

    const parsed = JSON.parse(row.editor_json) as unknown;
    return normalizePostEditorContent(parsed);
  } catch {
    return { ...EMPTY_POST_EDITOR_CONTENT };
  }
}

/**
 * Grava só a coluna `editor_json` — nunca título, slug, status ou qualquer
 * outra coluna de conteúdo. É o que garante que o Editor Visual não pode,
 * por construção, sobrescrever o que pertence ao CRUD tradicional.
 */
/**
 * Aparência efetiva da matéria para a hierarquia página-de-Conteúdos →
 * matéria: mescla esparsa, o valor da matéria vence quando preenchido. Não
 * materializa nada — o registro da matéria continua guardando só a própria
 * diferença.
 */
export function resolvePostPageStyle(listagem: PageStyle, post: PageStyle): PageStyle {
  return {
    brandColor: post.brandColor || listagem.brandColor,
    accentColor: post.accentColor || listagem.accentColor,
    backgroundColor: post.backgroundColor || listagem.backgroundColor,
    headingColor: post.headingColor || listagem.headingColor,
  };
}

export async function updatePostEditorContent(
  db: D1Database,
  postId: number,
  content: PostEditorContent
): Promise<boolean> {
  const json = JSON.stringify(content);
  if (json.length > MAX_JSON_LENGTH) return false;

  await db
    .prepare('UPDATE posts SET editor_json = ?1 WHERE id = ?2 AND deleted_at IS NULL')
    .bind(json, postId)
    .run();
  return true;
}
