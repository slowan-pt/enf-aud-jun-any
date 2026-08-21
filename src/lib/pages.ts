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
}

const DEFAULT_PROMO_VIDEO: PromoVideo = {
  title: 'Conheça a Essencial Saúde',
  text: 'Um vídeo curto sobre como atuamos junto a operadoras e prestadores.',
  url: '',
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
};

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
