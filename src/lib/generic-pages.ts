import type { D1Database } from './cf-types';
import {
  EMPTY_PAGE_STYLE,
  normalizeLayouts,
  normalizeOverlays,
  normalizePageStyle,
  type LayoutPair,
  type Overlay,
  type PageStyle,
  type SectionStyle,
} from './pages';
import { safeMediaUrl, slugify } from './urls';

export type GenericPageStatus = 'draft' | 'published';

export interface GenericSection {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  image: string;
  imageAlt: string;
}

export interface GenericPageContent {
  intro: string;
  sections: GenericSection[];
}

export interface GenericPageEditor {
  pageStyle: PageStyle;
  sectionStyles: Record<string, SectionStyle>;
  sectionOrder: string[];
  hiddenSections: string[];
  layouts: Record<string, LayoutPair>;
  overlays: Overlay[];
}

export interface GenericPage {
  id: number;
  title: string;
  slug: string;
  status: GenericPageStatus;
  content: GenericPageContent;
  editor: GenericPageEditor;
  seoTitle: string;
  seoDescription: string;
  indexable: boolean;
  socialImageId: number | null;
  socialImage: string;
  parentId: number | null;
  showInMenu: boolean;
  menuOrder: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GenericPageRow {
  id: number;
  title: string;
  slug: string;
  status: GenericPageStatus;
  sections_json: string;
  editor_json: string | null;
  seo_title: string;
  seo_description: string;
  indexable: number;
  social_image_id: number | null;
  social_image: string | null;
  parent_id: number | null;
  show_in_menu: number;
  menu_order: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

const SECTION_ID = /^[a-z0-9-]{1,40}$/;
const EMPTY_SECTION_STYLE: SectionStyle = {
  bg: '',
  text: '',
  image: '',
  overlay: '',
  minHeight: '',
  paddingY: '',
};

export const RESERVED_PAGE_SEGMENTS = new Set([
  'admin',
  'api',
  'media',
  'servicos',
  'conteudos',
  'quem-somos',
  'contato',
  'politica-de-privacidade',
]);

export function normalizeGenericPageSlug(value: string): string {
  const segments = String(value ?? '')
    .split('/')
    .map(slugify)
    .filter(Boolean);
  if (!segments.length || RESERVED_PAGE_SEGMENTS.has(segments[0]!)) return '';
  return `/${segments.slice(0, 5).join('/')}`;
}

export function normalizeGenericContent(value: unknown): GenericPageContent {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const sections = Array.isArray(raw.sections) ? raw.sections : [];
  const seen = new Set<string>();
  const normalized: GenericSection[] = [];

  for (const item of sections.slice(0, 30)) {
    const section = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const id = String(section.id ?? '');
    if (!SECTION_ID.test(id) || seen.has(id)) continue;
    seen.add(id);
    normalized.push({
      id,
      eyebrow: String(section.eyebrow ?? '').slice(0, 120),
      title: String(section.title ?? '').slice(0, 200),
      body: String(section.body ?? '').slice(0, 20_000),
      image: safeMediaUrl(String(section.image ?? '')),
      imageAlt: String(section.imageAlt ?? '').slice(0, 300),
    });
  }

  return { intro: String(raw.intro ?? '').slice(0, 2_000), sections: normalized };
}

export function normalizeGenericEditor(
  value: unknown,
  sectionIds: readonly string[]
): GenericPageEditor {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const known = new Set(sectionIds);
  const order = Array.isArray(raw.sectionOrder)
    ? raw.sectionOrder.filter((id): id is string => typeof id === 'string' && known.has(id))
    : [];
  for (const id of sectionIds) if (!order.includes(id)) order.push(id);
  const hidden = Array.isArray(raw.hiddenSections)
    ? raw.hiddenSections.filter((id): id is string => typeof id === 'string' && known.has(id))
    : [];
  const sectionStyles: Record<string, SectionStyle> = {};
  const rawStyles =
    raw.sectionStyles && typeof raw.sectionStyles === 'object'
      ? (raw.sectionStyles as Record<string, Partial<SectionStyle>>)
      : {};
  for (const id of sectionIds) {
    sectionStyles[id] = { ...EMPTY_SECTION_STYLE, ...(rawStyles[id] ?? {}) };
  }
  return {
    pageStyle: normalizePageStyle(raw.pageStyle),
    sectionStyles,
    sectionOrder: [...new Set(order)],
    hiddenSections: [...new Set(hidden)],
    layouts: normalizeLayouts(raw.layouts),
    overlays: normalizeOverlays(raw.overlays, sectionIds),
  };
}

function parseJson(value: string | null): unknown {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return {};
  }
}

function rowToPage(row: GenericPageRow): GenericPage {
  const content = normalizeGenericContent(parseJson(row.sections_json));
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    content,
    editor: normalizeGenericEditor(
      parseJson(row.editor_json),
      content.sections.map((section) => section.id)
    ),
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    indexable: row.indexable === 1,
    socialImageId: row.social_image_id,
    socialImage: safeMediaUrl(row.social_image ?? ''),
    parentId: row.parent_id,
    showInMenu: row.show_in_menu === 1,
    menuOrder: row.menu_order,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_GENERIC = `
  SELECT p.id, p.title, p.slug, p.status, p.sections_json, p.editor_json,
    p.seo_title, p.seo_description, p.indexable, p.social_image_id,
    m.url AS social_image, p.parent_id, p.show_in_menu, p.menu_order,
    p.archived_at, p.created_at, p.updated_at
  FROM pages p LEFT JOIN media m ON m.id = p.social_image_id AND m.deleted_at IS NULL
  WHERE p.page_type = 'generic'
`;

export async function listGenericPages(db: D1Database): Promise<GenericPage[]> {
  const { results } = await db
    .prepare(`${SELECT_GENERIC} ORDER BY p.archived_at IS NOT NULL, p.menu_order, p.title`)
    .all<GenericPageRow>();
  return (results ?? []).map(rowToPage);
}

export async function getGenericPageById(
  db: D1Database,
  id: number
): Promise<GenericPage | null> {
  const row = await db
    .prepare(`${SELECT_GENERIC} AND p.id = ?1`)
    .bind(id)
    .first<GenericPageRow>();
  return row ? rowToPage(row) : null;
}

export async function getGenericPageBySlug(
  db: D1Database,
  slug: string,
  includeUnpublished = false
): Promise<GenericPage | null> {
  const visibility = includeUnpublished
    ? ''
    : " AND p.status = 'published' AND p.archived_at IS NULL";
  const row = await db
    .prepare(`${SELECT_GENERIC} AND p.slug = ?1${visibility}`)
    .bind(slug)
    .first<GenericPageRow>();
  return row ? rowToPage(row) : null;
}

export async function pageSlugAvailable(
  db: D1Database,
  slug: string,
  exceptId?: number
): Promise<boolean> {
  const normalized = normalizeGenericPageSlug(slug);
  if (!normalized) return false;
  const row = await db
    .prepare('SELECT id FROM pages WHERE slug = ?1 AND (?2 IS NULL OR id <> ?2)')
    .bind(normalized, exceptId ?? null)
    .first<{ id: number }>();
  return !row;
}

export async function pageParentWouldCycle(
  db: D1Database,
  pageId: number,
  parentId: number | null
): Promise<boolean> {
  if (parentId === null) return false;
  if (pageId === parentId) return true;
  const { results } = await db
    .prepare("SELECT id, parent_id FROM pages WHERE page_type = 'generic'")
    .all<{ id: number; parent_id: number | null }>();
  const parents = new Map((results ?? []).map((row) => [row.id, row.parent_id]));
  const seen = new Set([pageId]);
  let cursor: number | null = parentId;
  while (cursor !== null) {
    if (seen.has(cursor)) return true;
    seen.add(cursor);
    cursor = parents.get(cursor) ?? null;
  }
  return false;
}

export interface GenericPageInput {
  title: string;
  slug: string;
  status: GenericPageStatus;
  content: GenericPageContent;
  seoTitle: string;
  seoDescription: string;
  indexable: boolean;
  socialImageId: number | null;
  parentId: number | null;
  showInMenu: boolean;
  menuOrder: number;
}

export async function createGenericPage(
  db: D1Database,
  input: GenericPageInput,
  userId?: number
): Promise<number> {
  const slug = normalizeGenericPageSlug(input.slug);
  if (!slug || !(await pageSlugAvailable(db, slug))) throw new Error('Slug indisponivel.');
  const content = normalizeGenericContent(input.content);
  const result = await db
    .prepare(
      `INSERT INTO pages (
        slug, title, status, sections_json, seo_title, seo_description, indexable,
        updated_by, page_type, parent_id, show_in_menu, menu_order, social_image_id, editor_json
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'generic', ?9, ?10, ?11, ?12, ?13)`
    )
    .bind(
      slug,
      input.title.trim().slice(0, 200),
      input.status,
      JSON.stringify(content),
      input.seoTitle.trim().slice(0, 200),
      input.seoDescription.trim().slice(0, 500),
      input.indexable ? 1 : 0,
      userId ?? null,
      input.parentId,
      input.showInMenu ? 1 : 0,
      Math.max(0, Math.round(input.menuOrder)),
      input.socialImageId,
      JSON.stringify({ pageStyle: EMPTY_PAGE_STYLE, layouts: {}, overlays: [] })
    )
    .run();
  const id = Number(result.meta.last_row_id ?? 0);
  await syncPageMenuItem(
    db,
    id,
    input.title,
    input.showInMenu,
    input.parentId,
    input.menuOrder
  );
  return id;
}

export async function updateGenericPage(
  db: D1Database,
  id: number,
  input: GenericPageInput,
  userId?: number
): Promise<void> {
  const existing = await getGenericPageById(db, id);
  if (!existing) throw new Error('Pagina nao encontrada.');
  const slug = normalizeGenericPageSlug(input.slug);
  if (!slug || !(await pageSlugAvailable(db, slug, id))) throw new Error('Slug indisponivel.');
  if (await pageParentWouldCycle(db, id, input.parentId)) {
    throw new Error('A pagina-pai criaria um ciclo.');
  }
  const update = db
    .prepare(
      `UPDATE pages SET slug = ?1, title = ?2, status = ?3, sections_json = ?4,
        seo_title = ?5, seo_description = ?6, indexable = ?7, updated_by = ?8,
        parent_id = ?9, show_in_menu = ?10, menu_order = ?11, social_image_id = ?12,
        updated_at = datetime('now')
       WHERE id = ?13 AND page_type = 'generic'`
    )
    .bind(
      slug,
      input.title.trim().slice(0, 200),
      input.status,
      JSON.stringify(normalizeGenericContent(input.content)),
      input.seoTitle.trim().slice(0, 200),
      input.seoDescription.trim().slice(0, 500),
      input.indexable ? 1 : 0,
      userId ?? null,
      input.parentId === id ? null : input.parentId,
      input.showInMenu ? 1 : 0,
      Math.max(0, Math.round(input.menuOrder)),
      input.socialImageId,
      id
    );
  if (existing.slug !== slug) {
    await db.batch([
      update,
      db
        .prepare(
          `INSERT INTO redirects (from_path, to_path, status_code) VALUES (?1, ?2, 301)
           ON CONFLICT(from_path) DO UPDATE SET to_path = excluded.to_path, status_code = 301`
        )
        .bind(existing.slug, slug),
    ]);
  } else {
    await update.run();
  }
  await syncPageMenuItem(
    db,
    id,
    input.title,
    input.showInMenu,
    input.parentId,
    input.menuOrder
  );
}

async function syncPageMenuItem(
  db: D1Database,
  pageId: number,
  title: string,
  visible: boolean,
  parentPageId: number | null,
  order: number
): Promise<void> {
  const parent = parentPageId
    ? await db
        .prepare(
          'SELECT id FROM navigation_items WHERE page_id = ?1 AND deleted_at IS NULL ORDER BY id LIMIT 1'
        )
        .bind(parentPageId)
        .first<{ id: number }>()
    : null;
  const existing = await db
    .prepare('SELECT id FROM navigation_items WHERE page_id = ?1 ORDER BY id LIMIT 1')
    .bind(pageId)
    .first<{ id: number }>();
  if (!visible) {
    if (existing) {
      await db
        .prepare(
          "UPDATE navigation_items SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE page_id = ?1 AND deleted_at IS NULL"
        )
        .bind(pageId)
        .run();
    }
    return;
  }
  if (existing) {
    await db
      .prepare(
        `UPDATE navigation_items SET label = ?1, parent_id = ?2, display_order = ?3,
          deleted_at = NULL, updated_at = datetime('now') WHERE id = ?4`
      )
      .bind(title.trim().slice(0, 100), parent?.id ?? null, Math.max(0, order), existing.id)
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO navigation_items
          (label, item_type, page_id, url, parent_id, display_order, new_tab)
         VALUES (?1, 'internal', ?2, '', ?3, ?4, 0)`
      )
      .bind(title.trim().slice(0, 100), pageId, parent?.id ?? null, Math.max(0, order))
      .run();
  }
}

export async function updateGenericPageEditor(
  db: D1Database,
  id: number,
  editor: GenericPageEditor,
  userId?: number
): Promise<void> {
  const page = await getGenericPageById(db, id);
  if (!page) throw new Error('Pagina nao encontrada.');
  const normalized = normalizeGenericEditor(
    editor,
    page.content.sections.map((section) => section.id)
  );
  await db
    .prepare(
      `UPDATE pages SET editor_json = ?1, updated_by = ?2, updated_at = datetime('now')
       WHERE id = ?3 AND page_type = 'generic'`
    )
    .bind(JSON.stringify(normalized), userId ?? null, id)
    .run();
}

export async function updateGenericPageVisualState(
  db: D1Database,
  id: number,
  content: GenericPageContent,
  editor: GenericPageEditor,
  userId?: number
): Promise<void> {
  const page = await getGenericPageById(db, id);
  if (!page) throw new Error('Pagina nao encontrada.');
  const normalizedContent = normalizeGenericContent(content);
  const normalizedEditor = normalizeGenericEditor(
    editor,
    normalizedContent.sections.map((section) => section.id)
  );
  await db
    .prepare(
      `UPDATE pages SET sections_json = ?1, editor_json = ?2, updated_by = ?3,
        updated_at = datetime('now') WHERE id = ?4 AND page_type = 'generic'`
    )
    .bind(
      JSON.stringify(normalizedContent),
      JSON.stringify(normalizedEditor),
      userId ?? null,
      id
    )
    .run();
}

export async function duplicateGenericPage(
  db: D1Database,
  id: number,
  userId?: number
): Promise<number> {
  const page = await getGenericPageById(db, id);
  if (!page) return 0;
  let suffix = 1;
  let slug = `${page.slug}-copia`;
  while (!(await pageSlugAvailable(db, slug))) slug = `${page.slug}-copia-${++suffix}`;
  const newId = await createGenericPage(
    db,
    {
      ...page,
      title: `${page.title} (copia)`,
      slug,
      status: 'draft',
      parentId: null,
      showInMenu: false,
      socialImageId: page.socialImageId,
    },
    userId
  );
  await db
    .prepare('UPDATE pages SET editor_json = ?1 WHERE id = ?2')
    .bind(JSON.stringify(page.editor), newId)
    .run();
  return newId;
}

export async function archiveGenericPage(db: D1Database, id: number): Promise<void> {
  await db.batch([
    db
      .prepare(
        "UPDATE pages SET archived_at = datetime('now'), status = 'draft', updated_at = datetime('now') WHERE id = ?1 AND page_type = 'generic'"
      )
      .bind(id),
    db
      .prepare(
        "UPDATE navigation_items SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE page_id = ?1 AND deleted_at IS NULL"
      )
      .bind(id),
  ]);
}

export async function restoreGenericPage(db: D1Database, id: number): Promise<void> {
  await db
    .prepare(
      "UPDATE pages SET archived_at = NULL, updated_at = datetime('now') WHERE id = ?1 AND page_type = 'generic'"
    )
    .bind(id)
    .run();
  const page = await getGenericPageById(db, id);
  if (page?.showInMenu) {
    await syncPageMenuItem(db, id, page.title, true, page.parentId, page.menuOrder);
  }
}

export async function permanentlyDeleteGenericPage(
  db: D1Database,
  id: number,
  confirmation: string
): Promise<boolean> {
  const page = await getGenericPageById(db, id);
  if (!page?.archivedAt || confirmation.trim() !== page.title) return false;
  await db.prepare("DELETE FROM pages WHERE id = ?1 AND page_type = 'generic'").bind(id).run();
  return true;
}

export function blankGenericContent(): GenericPageContent {
  return {
    intro: '',
    sections: [
      { id: 'conteudo', eyebrow: '', title: 'Nova secao', body: '', image: '', imageAlt: '' },
    ],
  };
}

export const GENERIC_PAGE_TEMPLATES: Record<
  string,
  { label: string; description: string; content: GenericPageContent }
> = {
  blank: {
    label: 'Pagina em branco',
    description: 'Uma secao vazia para comecar.',
    content: blankGenericContent(),
  },
  institutional: {
    label: 'Apresentacao institucional',
    description: 'Contexto, atuacao e diferenciais editaveis.',
    content: {
      intro: 'Apresente a organizacao de forma objetiva.',
      sections: [
        {
          id: 'apresentacao',
          eyebrow: 'Institucional',
          title: 'Quem somos',
          body: 'Descreva aqui a historia, o contexto e a area de atuacao da organizacao.',
          image: '',
          imageAlt: '',
        },
        {
          id: 'diferenciais',
          eyebrow: 'Atuacao',
          title: 'Como trabalhamos',
          body: 'Liste os principios e diferenciais que orientam o trabalho da equipe.',
          image: '',
          imageAlt: '',
        },
      ],
    },
  },
  indicators: {
    label: 'Indicadores',
    description: 'Estrutura neutra para indicadores confirmados.',
    content: {
      intro: 'Use somente dados conferidos e informe o periodo de referencia.',
      sections: [
        {
          id: 'indicadores',
          eyebrow: 'Indicadores',
          title: 'Resultados do periodo',
          body: 'Indicador 1: informe o valor e a fonte.\nIndicador 2: informe o valor e a fonte.\nIndicador 3: informe o valor e a fonte.',
          image: '',
          imageAlt: '',
        },
      ],
    },
  },
  team: {
    label: 'Equipe',
    description: 'Apresentacao editavel de profissionais.',
    content: {
      intro: 'Apresente as pessoas e suas responsabilidades.',
      sections: [
        {
          id: 'equipe',
          eyebrow: 'Equipe',
          title: 'Profissionais',
          body: 'Nome do profissional\nCargo ou especialidade\nBreve apresentacao profissional',
          image: '',
          imageAlt: '',
        },
      ],
    },
  },
  careFlow: {
    label: 'Fluxo assistencial',
    description: 'Etapas editaveis de um fluxo de cuidado.',
    content: {
      intro: 'Organize o percurso assistencial conforme o processo real.',
      sections: [
        {
          id: 'fluxo',
          eyebrow: 'Fluxo assistencial',
          title: 'Etapas do atendimento',
          body: '1. Entrada e acolhimento\n2. Avaliacao\n3. Definicao da conduta\n4. Acompanhamento\n5. Encerramento e continuidade',
          image: '',
          imageAlt: '',
        },
      ],
    },
  },
  auditStages: {
    label: 'Etapas de auditoria',
    description: 'Sequencia neutra para adaptar ao processo.',
    content: {
      intro: 'Ajuste as etapas ao metodo utilizado pela organizacao.',
      sections: [
        {
          id: 'etapas',
          eyebrow: 'Processo',
          title: 'Etapas da auditoria',
          body: '1. Planejamento\n2. Coleta de informacoes\n3. Analise tecnica\n4. Devolutiva\n5. Acompanhamento',
          image: '',
          imageAlt: '',
        },
      ],
    },
  },
  values: {
    label: 'Missao, visao e valores',
    description: 'Tres secoes institucionais sem afirmacoes inventadas.',
    content: {
      intro: 'Registre as diretrizes institucionais aprovadas.',
      sections: [
        {
          id: 'missao',
          eyebrow: 'Missao',
          title: 'Nossa missao',
          body: 'Edite a missao institucional.',
          image: '',
          imageAlt: '',
        },
        {
          id: 'visao',
          eyebrow: 'Visao',
          title: 'Nossa visao',
          body: 'Edite a visao institucional.',
          image: '',
          imageAlt: '',
        },
        {
          id: 'valores',
          eyebrow: 'Valores',
          title: 'Nossos valores',
          body: 'Edite os valores institucionais.',
          image: '',
          imageAlt: '',
        },
      ],
    },
  },
  contact: {
    label: 'Contato',
    description: 'Canais e orientacao para contato.',
    content: {
      intro: 'Facilite o contato com informacoes objetivas.',
      sections: [
        {
          id: 'contato',
          eyebrow: 'Contato',
          title: 'Fale conosco',
          body: 'Informe os canais oficiais, horarios e orientacoes para atendimento.',
          image: '',
          imageAlt: '',
        },
      ],
    },
  },
  cta: {
    label: 'Chamada para acao',
    description: 'Mensagem curta com proximo passo.',
    content: {
      intro: '',
      sections: [
        {
          id: 'chamada',
          eyebrow: 'Proximo passo',
          title: 'Como podemos ajudar?',
          body: 'Edite esta mensagem e acrescente o destino desejado pelo Editor Visual.',
          image: '',
          imageAlt: '',
        },
      ],
    },
  },
};
