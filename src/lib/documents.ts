/**
 * Modelo genérico de "documento de página" — a base comum que qualquer
 * página migrada do Astro estático para o banco usa: metadados (SEO/status),
 * seções com seu próprio `SectionStyle`, sobrescrita de página (`PageStyle`),
 * elementos livres (`Overlay`) e posições existentes (`layouts`). Todos esses
 * tipos vêm de `pages.ts` — o mesmo usado pela Home — para não duplicar.
 *
 * Cada página migrada declara seu PRÓPRIO conteúdo tipado (como `HomeContent`
 * já fazia) em vez de um array de blocos genérico interpretado em runtime:
 * mais simples, mesmo padrão já testado, e cada página pode continuar usando
 * componentes visuais específicos (ex.: EloDiagram) em vez de virar um
 * canvas genérico.
 *
 * Primeira página migrada: Quem Somos.
 */
import {
  about as defaultAbout,
  elo as defaultElo,
  howWeWork as defaultHowWeWork,
  missionVisionValues as defaultMissionVisionValues,
  clientSegments as defaultClientSegments,
} from '../data/institutional';
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

export const QUEM_SOMOS_SECTION_KEYS = ['about', 'elo', 'howWeWork', 'mvv', 'segments'] as const;
export type QuemSomosSectionKey = (typeof QUEM_SOMOS_SECTION_KEYS)[number];

export interface QuemSomosContent {
  about: typeof defaultAbout;
  elo: typeof defaultElo;
  howWeWork: typeof defaultHowWeWork;
  missionVisionValues: typeof defaultMissionVisionValues;
  clientSegments: typeof defaultClientSegments;
  pageStyle: PageStyle;
  sectionStyles: Record<QuemSomosSectionKey, SectionStyle>;
  sectionOrder: QuemSomosSectionKey[];
  hiddenSections: QuemSomosSectionKey[];
  layouts: Record<string, LayoutPair>;
  overlays: Overlay[];
}

const DEFAULT_QUEM_SOMOS: QuemSomosContent = {
  about: defaultAbout,
  elo: defaultElo,
  howWeWork: defaultHowWeWork,
  missionVisionValues: defaultMissionVisionValues,
  clientSegments: defaultClientSegments,
  pageStyle: { ...EMPTY_PAGE_STYLE },
  sectionStyles: {
    about: { ...EMPTY_STYLE },
    elo: { ...EMPTY_STYLE },
    howWeWork: { ...EMPTY_STYLE },
    mvv: { ...EMPTY_STYLE },
    segments: { ...EMPTY_STYLE },
  },
  sectionOrder: [...QUEM_SOMOS_SECTION_KEYS],
  hiddenSections: [],
  layouts: {},
  overlays: [],
};

function normalizeSectionKeys(
  value: unknown,
  fallback: QuemSomosSectionKey[]
): QuemSomosSectionKey[] {
  if (!Array.isArray(value)) return fallback;
  const seen = new Set<QuemSomosSectionKey>();
  for (const item of value) {
    if (typeof item === 'string' && (QUEM_SOMOS_SECTION_KEYS as readonly string[]).includes(item)) {
      seen.add(item as QuemSomosSectionKey);
    }
  }
  for (const key of QUEM_SOMOS_SECTION_KEYS) {
    if (!seen.has(key) && fallback.includes(key)) seen.add(key);
  }
  return [...seen];
}

interface PageRow {
  id: number;
  sections_json: string;
  updated_at: string;
}

export const QUEM_SOMOS_SLUG = '/quem-somos';

/**
 * Igual em espírito a `getHomeContent`: linha ausente cai no padrão (o
 * conteúdo estático que já existe hoje em `data/institutional.ts`) — a
 * página continua idêntica até alguém editar pelo painel.
 */
export async function getQuemSomosContent(
  db: D1Database
): Promise<QuemSomosContent & { updatedAt: string }> {
  try {
    const row = await db
      .prepare('SELECT id, sections_json, updated_at FROM pages WHERE slug = ?1')
      .bind(QUEM_SOMOS_SLUG)
      .first<PageRow>();
    if (!row) return { ...DEFAULT_QUEM_SOMOS, updatedAt: '' };

    const stored = JSON.parse(row.sections_json) as Partial<QuemSomosContent>;
    return {
      about: { ...DEFAULT_QUEM_SOMOS.about, ...stored.about },
      elo: { ...DEFAULT_QUEM_SOMOS.elo, ...stored.elo },
      howWeWork: { ...DEFAULT_QUEM_SOMOS.howWeWork, ...stored.howWeWork },
      missionVisionValues: {
        ...DEFAULT_QUEM_SOMOS.missionVisionValues,
        ...stored.missionVisionValues,
      },
      clientSegments: { ...DEFAULT_QUEM_SOMOS.clientSegments, ...stored.clientSegments },
      pageStyle: normalizePageStyle(stored.pageStyle),
      sectionStyles: {
        ...DEFAULT_QUEM_SOMOS.sectionStyles,
        ...Object.fromEntries(
          Object.entries(stored.sectionStyles ?? {}).map(([key, value]) => [
            key,
            { ...EMPTY_STYLE, ...value },
          ])
        ),
      } as Record<QuemSomosSectionKey, SectionStyle>,
      sectionOrder: normalizeSectionKeys(stored.sectionOrder, [...QUEM_SOMOS_SECTION_KEYS]),
      hiddenSections: normalizeSectionKeys(stored.hiddenSections, []),
      layouts: normalizeLayouts(stored.layouts),
      overlays: normalizeOverlays(stored.overlays, QUEM_SOMOS_SECTION_KEYS),
      updatedAt: row.updated_at,
    };
  } catch {
    return { ...DEFAULT_QUEM_SOMOS, updatedAt: '' };
  }
}

/**
 * `INSERT ... ON CONFLICT` em vez de um `UPDATE` simples: diferente da Home
 * (cuja linha já existe desde o seed inicial), a linha da Quem Somos só é
 * criada na primeira gravação — antes disso a página só lê o padrão estático,
 * sem precisar de uma migração/seed separada para "existir" no banco.
 */
export async function updateQuemSomosContent(
  db: D1Database,
  content: QuemSomosContent,
  userId?: number
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO pages (slug, title, status, sections_json, updated_by, updated_at)
       VALUES (?1, 'Quem Somos', 'published', ?2, ?3, datetime('now'))
       ON CONFLICT(slug) DO UPDATE SET
         sections_json = excluded.sections_json,
         updated_by = excluded.updated_by,
         updated_at = datetime('now')`
    )
    .bind(QUEM_SOMOS_SLUG, JSON.stringify(content), userId ?? null)
    .run();
}
