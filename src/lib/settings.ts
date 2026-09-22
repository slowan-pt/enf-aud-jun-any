/**
 * Configurações administráveis (Empresa, WhatsApp, Redes sociais) — lidas do
 * D1 (tabela `settings`, chave/valor JSON) com fallback para os valores em
 * `src/data/site.ts` quando a chave ainda não existe no banco (primeira
 * execução, antes do seed).
 *
 * `src/data/site.ts` continua sendo a fonte de tipos e do valor padrão —
 * apenas deixa de ser a fonte de verdade em runtime depois que o admin
 * grava uma alteração.
 */
import {
  company as defaultCompany,
  whatsapp as defaultWhatsapp,
  social as defaultSocial,
  seo as siteSeo,
} from '../data/site';
import {
  howWeWork as defaultHowWeWork,
  missionVisionValues as defaultMissionVisionValues,
  clientSegments as defaultClientSegments,
} from '../data/institutional';
import type { D1Database } from './cf-types';

export interface SeoSettings {
  gscVerification: string;
  gaId: string;
  ogDefaultImage: string;
}

export interface BrandSettings {
  markUrl: string;
  logoUrl: string;
}

/** Paleta global do site — poucas cores-chave que derivam o resto por CSS. */
export interface ThemeSettings {
  brandColor: string;
  accentColor: string;
  backgroundColor: string;
  headingColor: string;
}

export interface SiteSettings {
  company: typeof defaultCompany;
  whatsapp: typeof defaultWhatsapp;
  social: typeof defaultSocial;
  seo: SeoSettings;
  brand: BrandSettings;
  theme: ThemeSettings;
  /**
   * Conteúdo institucional COMPARTILHADO entre Home, Quem Somos e (parte
   * dele) Serviços — antes cada página guardava sua própria cópia, editada
   * em separado; quem editasse numa página não via o resultado nas outras.
   * Agora é uma fonte só: qualquer editor grava aqui, todas as páginas leem
   * daqui (ver `Astro.locals.settings`, populado no middleware).
   */
  howWeWork: typeof defaultHowWeWork;
  missionVisionValues: typeof defaultMissionVisionValues;
  clientSegments: typeof defaultClientSegments;
}

const DEFAULT_SEO: SeoSettings = {
  gscVerification: '',
  gaId: '',
  ogDefaultImage: siteSeo.defaultOgImage,
};

const DEFAULT_BRAND: BrandSettings = {
  markUrl: '/logo/essencial-saude-mark.png',
  logoUrl: '',
};

/** Mesmas cores já usadas em tokens.css (--c-brand-900, --c-accent-600, --bg, --text-strong). */
const DEFAULT_THEME: ThemeSettings = {
  brandColor: '#253550',
  accentColor: '#138b82',
  backgroundColor: '#ffffff',
  headingColor: '#253550',
};

const DEFAULTS: SiteSettings = {
  company: defaultCompany,
  whatsapp: defaultWhatsapp,
  social: defaultSocial,
  seo: DEFAULT_SEO,
  brand: DEFAULT_BRAND,
  theme: DEFAULT_THEME,
  howWeWork: defaultHowWeWork,
  missionVisionValues: defaultMissionVisionValues,
  clientSegments: defaultClientSegments,
};

export async function getSettings(db: D1Database): Promise<SiteSettings> {
  try {
    const { results } = await db
      .prepare(
        'SELECT key, value_json FROM settings WHERE key IN (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)'
      )
      .bind(
        'company',
        'whatsapp',
        'social',
        'seo',
        'brand',
        'theme',
        'howWeWork',
        'missionVisionValues',
        'clientSegments'
      )
      .all<{ key: string; value_json: string }>();

    const out: SiteSettings = {
      company: DEFAULTS.company,
      whatsapp: DEFAULTS.whatsapp,
      social: DEFAULTS.social,
      seo: DEFAULTS.seo,
      brand: DEFAULTS.brand,
      theme: DEFAULTS.theme,
      howWeWork: DEFAULTS.howWeWork,
      missionVisionValues: DEFAULTS.missionVisionValues,
      clientSegments: DEFAULTS.clientSegments,
    };

    for (const row of results) {
      try {
        const value = JSON.parse(row.value_json);
        if (row.key === 'company') out.company = { ...DEFAULTS.company, ...value };
        if (row.key === 'whatsapp') out.whatsapp = { ...DEFAULTS.whatsapp, ...value };
        if (row.key === 'social') out.social = Array.isArray(value) ? value : DEFAULTS.social;
        if (row.key === 'seo') out.seo = { ...DEFAULTS.seo, ...value };
        if (row.key === 'brand') out.brand = { ...DEFAULTS.brand, ...value };
        if (row.key === 'theme') out.theme = { ...DEFAULTS.theme, ...value };
        if (row.key === 'howWeWork') out.howWeWork = { ...DEFAULTS.howWeWork, ...value };
        if (row.key === 'missionVisionValues') {
          out.missionVisionValues = { ...DEFAULTS.missionVisionValues, ...value };
        }
        if (row.key === 'clientSegments') {
          out.clientSegments = { ...DEFAULTS.clientSegments, ...value };
        }
      } catch {
        // valor corrompido no banco: ignora e mantém o padrão dessa chave
      }
    }
    return out;
  } catch {
    // sem banco disponível (ex.: erro de binding) — nunca derruba o site público
    return DEFAULTS;
  }
}

export async function updateSetting(
  db: D1Database,
  key:
    | 'company'
    | 'whatsapp'
    | 'social'
    | 'seo'
    | 'brand'
    | 'theme'
    | 'howWeWork'
    | 'missionVisionValues'
    | 'clientSegments',
  value: unknown,
  userId?: number
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO settings (key, value_json, updated_by, updated_at)
       VALUES (?1, ?2, ?3, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET
         value_json = excluded.value_json,
         updated_by = excluded.updated_by,
         updated_at = datetime('now')`
    )
    .bind(key, JSON.stringify(value), userId ?? null)
    .run();
}
