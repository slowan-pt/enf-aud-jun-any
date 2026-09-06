/**
 * Conteúdo da Home (e, futuramente, outras páginas institucionais) — lido do
 * D1 (tabela `pages`, coluna `sections_json`) com fallback para os valores em
 * `src/data/institutional.ts` quando a linha ainda não existe no banco.
 *
 * Mesma estratégia de `settings.ts`: o arquivo estático continua sendo a
 * fonte de tipos e do valor padrão, mas deixa de ser a fonte de verdade em
 * runtime depois que o admin grava uma alteração.
 */
import {
  hero as defaultHero,
  valueProposition as defaultValueProposition,
  elo as defaultElo,
  benefits as defaultBenefits,
  howWeWork as defaultHowWeWork,
  missionVisionValues as defaultMissionVisionValues,
  clientSegments as defaultClientSegments,
  finalCta as defaultFinalCta,
} from '../data/institutional';
import type { D1Database } from './cf-types';

export interface PromoVideo {
  title: string;
  text: string;
  url: string;
}

/** Cor de fundo/texto por seção — vazio herda a paleta global (Aparência). */
export interface SectionStyle {
  bg: string;
  text: string;
}

/**
 * Na mesma sequência em que as seções aparecem na Home — é essa ordem que vira
 * o padrão de `sectionOrder`, então ela precisa espelhar a página real.
 */
export const HOME_SECTION_KEYS = [
  'hero',
  'promoVideo',
  'proposta',
  'elo',
  'beneficios',
  'comoAtuamos',
  'mvv',
  'segmentos',
  'cta',
] as const;

/**
 * Posições que as seções editáveis ocupam na Home. As demais seções (Serviços,
 * Conteúdos, formulário) são alimentadas por outras telas do painel e mantêm
 * seus lugares fixos — reordenar no editor troca quem ocupa cada posição desta
 * lista, preservando o ritmo geral da página.
 */
export const HOME_EDITABLE_SLOTS = [0, 1, 2, 3, 7, 8, 10, 11, 13] as const;

export type HomeSectionKey = (typeof HOME_SECTION_KEYS)[number];
export type SectionStyles = Record<HomeSectionKey, SectionStyle>;

export interface HomeContent {
  hero: typeof defaultHero;
  valueProposition: typeof defaultValueProposition;
  elo: typeof defaultElo;
  benefits: typeof defaultBenefits;
  howWeWork: typeof defaultHowWeWork;
  missionVisionValues: typeof defaultMissionVisionValues;
  clientSegments: typeof defaultClientSegments;
  finalCta: typeof defaultFinalCta;
  /** Vídeo institucional/promocional — some da Home enquanto `url` estiver vazia. */
  promoVideo: PromoVideo;
  /** Cor de fundo/texto por seção (opcional) — ver SectionStyle. */
  sectionStyles: SectionStyles;
  /** Ordem de exibição das seções, definida ao arrastar no editor visual. */
  sectionOrder: HomeSectionKey[];
  /** Seções ocultadas no editor visual — continuam salvas, apenas não renderizam. */
  hiddenSections: HomeSectionKey[];
}

const DEFAULT_PROMO_VIDEO: PromoVideo = {
  title: 'Conheça a Essencial Saúde',
  text: 'Um vídeo curto sobre como atuamos junto a operadoras e prestadores.',
  url: '',
};

const EMPTY_STYLE: SectionStyle = { bg: '', text: '' };

const DEFAULT_SECTION_STYLES: SectionStyles = {
  hero: { ...EMPTY_STYLE },
  proposta: { ...EMPTY_STYLE },
  elo: { ...EMPTY_STYLE },
  beneficios: { ...EMPTY_STYLE },
  comoAtuamos: { ...EMPTY_STYLE },
  mvv: { ...EMPTY_STYLE },
  segmentos: { ...EMPTY_STYLE },
  cta: { ...EMPTY_STYLE },
  promoVideo: { ...EMPTY_STYLE },
};

const DEFAULT_HOME: HomeContent = {
  hero: defaultHero,
  valueProposition: defaultValueProposition,
  elo: defaultElo,
  benefits: defaultBenefits,
  howWeWork: defaultHowWeWork,
  missionVisionValues: defaultMissionVisionValues,
  clientSegments: defaultClientSegments,
  finalCta: defaultFinalCta,
  promoVideo: DEFAULT_PROMO_VIDEO,
  sectionStyles: DEFAULT_SECTION_STYLES,
  sectionOrder: [...HOME_SECTION_KEYS],
  hiddenSections: [],
};

/**
 * Mantém apenas chaves conhecidas e completa o que faltar. Conteúdo salvo antes
 * do editor visual não tem `sectionOrder`; nesse caso a ordem original do site é
 * usada, então a página continua aparecendo exatamente como está hoje.
 */
function normalizeSectionKeys(value: unknown, fallback: HomeSectionKey[]): HomeSectionKey[] {
  if (!Array.isArray(value)) return fallback;
  const seen = new Set<HomeSectionKey>();
  for (const item of value) {
    if (typeof item === 'string' && (HOME_SECTION_KEYS as readonly string[]).includes(item)) {
      seen.add(item as HomeSectionKey);
    }
  }
  // Seções novas (criadas depois do conteúdo ter sido salvo) entram no fim.
  for (const key of HOME_SECTION_KEYS) {
    if (!seen.has(key) && fallback.includes(key)) seen.add(key);
  }
  return [...seen];
}

/** Gera `background:#…;color:#…` só para os campos preenchidos (senão herda o global). */
export function sectionStyleAttr(style: SectionStyle | undefined): string | undefined {
  if (!style) return undefined;
  const parts: string[] = [];
  if (style.bg) parts.push(`background:${style.bg}`);
  if (style.text) parts.push(`color:${style.text}`);
  return parts.length ? parts.join(';') : undefined;
}

interface PageRow {
  sections_json: string;
  updated_at: string;
}

export async function getHomeContent(
  db: D1Database
): Promise<HomeContent & { updatedAt: string }> {
  try {
    const row = await db
      .prepare("SELECT sections_json, updated_at FROM pages WHERE slug = '/'")
      .first<PageRow>();
    if (!row) return { ...DEFAULT_HOME, updatedAt: '' };
    const stored = JSON.parse(row.sections_json) as Partial<HomeContent>;
    return {
      hero: { ...DEFAULT_HOME.hero, ...stored.hero },
      valueProposition: { ...DEFAULT_HOME.valueProposition, ...stored.valueProposition },
      elo: { ...DEFAULT_HOME.elo, ...stored.elo },
      benefits: { ...DEFAULT_HOME.benefits, ...stored.benefits },
      howWeWork: { ...DEFAULT_HOME.howWeWork, ...stored.howWeWork },
      missionVisionValues: {
        ...DEFAULT_HOME.missionVisionValues,
        ...stored.missionVisionValues,
      },
      clientSegments: { ...DEFAULT_HOME.clientSegments, ...stored.clientSegments },
      finalCta: { ...DEFAULT_HOME.finalCta, ...stored.finalCta },
      promoVideo: { ...DEFAULT_HOME.promoVideo, ...stored.promoVideo },
      sectionStyles: {
        ...DEFAULT_HOME.sectionStyles,
        ...Object.fromEntries(
          Object.entries(stored.sectionStyles ?? {}).map(([key, value]) => [
            key,
            { ...EMPTY_STYLE, ...value },
          ])
        ),
      } as SectionStyles,
      sectionOrder: normalizeSectionKeys(stored.sectionOrder, [...HOME_SECTION_KEYS]),
      hiddenSections: normalizeSectionKeys(stored.hiddenSections, []),
      updatedAt: row.updated_at,
    };
  } catch {
    return { ...DEFAULT_HOME, updatedAt: '' };
  }
}

export async function updateHomeContent(
  db: D1Database,
  content: HomeContent,
  userId?: number
): Promise<void> {
  await db
    .prepare(
      `UPDATE pages SET sections_json = ?1, updated_by = ?2, updated_at = datetime('now')
       WHERE slug = '/'`
    )
    .bind(JSON.stringify(content), userId ?? null)
    .run();
}
