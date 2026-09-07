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

/** Fundo/texto por seção — campo vazio herda a paleta global (Aparência). */
export interface SectionStyle {
  bg: string;
  text: string;
  /** Imagem de fundo (caminho da Mídia); fica por cima da cor de `bg`. */
  image: string;
  /** Escurecimento sobre a imagem, 0 a 100, para o texto continuar legível. */
  overlay: string;
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

/**
 * Sistema de coordenadas de `x`/`y`.
 *
 * 1 — LEGADO. Porcentagem do próprio elemento, que era como `translate(%)`
 *     interpretava. Defeito: mudar texto, fonte ou largura mexia na posição,
 *     porque o denominador era o tamanho do elemento.
 * 2 — ATUAL. Centésimos da LARGURA DA SEÇÃO (unidade `cqw`). O denominador é a
 *     seção, então o tamanho do elemento deixou de influenciar a posição.
 *
 * Layout sem `v` é legado e continua sendo desenhado pela regra antiga, para
 * não pular de lugar. O editor converte ao abrir a página (ver `migrateLayout`).
 */
export type CoordSystem = 1 | 2;

/** Tipos de elemento livre aceitos. Vale para leitura e para gravação. */
export const OVERLAY_KINDS = ['text', 'image', 'video', 'icon', 'shape'] as const;
export type OverlayKind = (typeof OVERLAY_KINDS)[number];

/**
 * Posição e estilo livres de um elemento dentro da sua seção.
 *
 * Tudo é proporcional à seção, nunca pixel fixo: é o que faz a mesma
 * configuração continuar valendo em qualquer largura de tela.
 *
 * `x`/`y` são deslocamento, aplicado com `transform: translate()`. O elemento
 * continua no fluxo do documento — sai do lugar visualmente sem derrubar o
 * layout dos vizinhos, que é o que permite mover livremente sem transformar a
 * página num canvas de posição absoluta.
 *
 * Os dois eixos usam a LARGURA da seção como referência. A altura ficaria
 * instável (muda toda vez que um texto reflui) e `cqh` só resolveria com
 * `container-type: size`, que exige altura fixa e quebraria as seções.
 */
export interface ElementLayout {
  /** Sistema de coordenadas de x/y. Ver CoordSystem. */
  v: CoordSystem;
  /** Deslocamento horizontal, em centésimos da largura da seção. */
  x: number;
  /** Deslocamento vertical, em centésimos da largura da seção. */
  y: number;
  /** Largura em % da seção. 0 = largura natural. */
  w: number;
  /** Altura em % da seção. 0 = altura natural. */
  h: number;
  /** Ordem visual (z-index). */
  z: number;
  /** Corpo do texto em rem. 0 = herda. */
  fontSize: number;
  /** Cor do texto. Vazio = herda. */
  color: string;
  /** '', 'left', 'center', 'right' ou 'justify'. */
  align: string;
  /** Peso da fonte (400–800). 0 = herda. */
  weight: number;
  /** Rotação em graus, -180 a 180. */
  r: number;
  /** Bloqueado: não pode ser arrastado nem redimensionado no editor. */
  locked: boolean;
  /** Oculto no site. O elemento continua no conteúdo, só não é exibido. */
  hidden: boolean;
  /** Nome dado no painel de camadas. Vazio = usa o rótulo padrão. */
  label: string;
}

/** Configuração por tamanho de tela. `mobile` nulo herda o desktop. */
export interface LayoutPair {
  desktop: ElementLayout;
  mobile: ElementLayout | null;
}

/** Elemento novo criado no editor, sobreposto dentro de uma seção. */
export interface Overlay {
  id: string;
  section: HomeSectionKey;
  kind: OverlayKind;
  /** Texto, caminho da mídia ou nome do ícone, conforme `kind`. */
  content: string;
  alt: string;
  desktop: ElementLayout;
  mobile: ElementLayout | null;
}

export const EMPTY_LAYOUT: ElementLayout = {
  v: 2,
  x: 0,
  y: 0,
  w: 0,
  h: 0,
  z: 0,
  fontSize: 0,
  color: '',
  align: '',
  weight: 0,
  r: 0,
  locked: false,
  hidden: false,
  label: '',
};

/** Largura a partir da qual vale a configuração de desktop. */
export const MOBILE_BREAKPOINT = 768;

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
  /** Posição/estilo livres dos elementos existentes, indexados pelo caminho `data-edit`. */
  layouts: Record<string, LayoutPair>;
  /** Elementos criados no editor, sobrepostos dentro de uma seção. */
  overlays: Overlay[];
}

const DEFAULT_PROMO_VIDEO: PromoVideo = {
  title: 'Conheça a Essencial Saúde',
  text: 'Um vídeo curto sobre como atuamos junto a operadoras e prestadores.',
  url: '',
};

const EMPTY_STYLE: SectionStyle = { bg: '', text: '', image: '', overlay: '' };

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
  layouts: {},
  overlays: [],
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

const HEX = /^#[0-9a-fA-F]{6}$/;
/** Caminhos são gerados por nós; o formato é conferido antes de virar seletor CSS. */
const EDIT_PATH = /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$/;
const OVERLAY_ID = /^[a-z0-9-]{1,40}$/;
const ALIGN = new Set(['left', 'center', 'right', 'justify']);

function clamp(value: unknown, min: number, max: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.min(max, Math.max(min, Math.round(num * 100) / 100));
}

/** Descarta qualquer valor fora do esperado — o conteúdo vem do banco. */
export function normalizeLayout(value: unknown): ElementLayout {
  const isStored = typeof value === 'object' && value !== null;
  const raw = (value ?? {}) as Record<string, unknown>;

  // Um layout gravado que não declara o sistema de coordenadas veio de antes
  // da correção: é legado. Objeto ausente é elemento novo, já no sistema atual.
  const hasPosition = isStored && ('x' in raw || 'y' in raw);
  const v: CoordSystem = raw.v === 2 ? 2 : hasPosition ? 1 : 2;

  return {
    v,
    x: clamp(raw.x, -500, 500),
    y: clamp(raw.y, -500, 500),
    w: clamp(raw.w, 0, 100),
    h: clamp(raw.h, 0, 100),
    z: clamp(raw.z, 0, 99),
    fontSize: clamp(raw.fontSize, 0, 12),
    color: typeof raw.color === 'string' && HEX.test(raw.color) ? raw.color : '',
    align: typeof raw.align === 'string' && ALIGN.has(raw.align) ? raw.align : '',
    weight: clamp(raw.weight, 0, 900),
    r: clamp(raw.r, -180, 180),
    locked: raw.locked === true,
    hidden: raw.hidden === true,
    label: typeof raw.label === 'string' ? raw.label.slice(0, 60) : '',
  };
}

function normalizeLayoutPair(value: unknown): LayoutPair {
  const raw = (value ?? {}) as Record<string, unknown>;
  return {
    desktop: normalizeLayout(raw.desktop),
    mobile: raw.mobile ? normalizeLayout(raw.mobile) : null,
  };
}

function normalizeLayouts(value: unknown): Record<string, LayoutPair> {
  if (!value || typeof value !== 'object') return {};
  const out: Record<string, LayoutPair> = {};
  for (const [path, pair] of Object.entries(value as Record<string, unknown>)) {
    if (EDIT_PATH.test(path)) out[path] = normalizeLayoutPair(pair);
  }
  return out;
}

function normalizeOverlays(value: unknown): Overlay[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: Overlay[] = [];

  for (const item of value.slice(0, 100)) {
    const raw = (item ?? {}) as Record<string, unknown>;
    const id = String(raw.id ?? '');
    const section = String(raw.section ?? '');
    const kind = String(raw.kind ?? '');

    if (!OVERLAY_ID.test(id) || seen.has(id)) continue;
    if (!(HOME_SECTION_KEYS as readonly string[]).includes(section)) continue;
    if (!(OVERLAY_KINDS as readonly string[]).includes(kind)) continue;

    seen.add(id);
    out.push({
      id,
      section: section as HomeSectionKey,
      kind: kind as OverlayKind,
      content: String(raw.content ?? '').slice(0, 2000),
      alt: String(raw.alt ?? '').slice(0, 300),
      desktop: normalizeLayout(raw.desktop),
      mobile: raw.mobile ? normalizeLayout(raw.mobile) : null,
    });
  }
  return out;
}

/**
 * Comprimento de um eixo. No sistema atual (v2) sai em `cqw` — centésimos da
 * largura da seção, resolvido pelo próprio CSS, sem depender de JavaScript nem
 * do tamanho do elemento. No legado (v1) sai em `%`, que o navegador resolve
 * contra o próprio elemento; é assim que o valor antigo continua aparecendo no
 * mesmo lugar até o editor convertê-lo.
 */
function axis(value: number, v: CoordSystem): string {
  return v === 2 ? `${value}cqw` : `${value}%`;
}

/** Declarações CSS de um layout. Vazio quando nada foi configurado. */
function layoutDeclarations(layout: ElementLayout, absolute: boolean): string[] {
  const parts: string[] = [];

  if (layout.hidden) return ['display:none'];

  // Elemento livre é posicionado por `left`/`top`; o existente é deslocado da
  // sua posição natural por `translate`, para não sair do fluxo. A rotação
  // entra no mesmo `transform` nos dois casos.
  const transforms: string[] = [];
  if (absolute) {
    parts.push(
      'position:absolute',
      `left:${axis(layout.x, layout.v)}`,
      `top:${axis(layout.y, layout.v)}`
    );
  } else if (layout.x !== 0 || layout.y !== 0) {
    transforms.push(`translate(${axis(layout.x, layout.v)},${axis(layout.y, layout.v)})`);
  }

  if (layout.r !== 0) transforms.push(`rotate(${layout.r}deg)`);
  if (transforms.length) parts.push(`transform:${transforms.join(' ')}`);

  // Tamanho também em `cqw`: com `%` a referência seria o elemento-pai, que
  // pode ser um container aninhado dentro da seção. `cqw` sempre resolve na
  // seção, que é o que torna a medida previsível.
  if (layout.w > 0) parts.push(`width:${layout.w}cqw`);
  if (layout.h > 0) parts.push(`height:${layout.h}cqw`);
  if (layout.z > 0) parts.push(`z-index:${layout.z}`, 'position:relative');
  if (layout.fontSize > 0) parts.push(`font-size:${layout.fontSize}rem`);
  if (layout.color) parts.push(`color:${layout.color}`);
  if (layout.align) parts.push(`text-align:${layout.align}`);
  if (layout.weight > 0) parts.push(`font-weight:${layout.weight}`);

  // `transform` e `width` não têm efeito em elemento inline (um <span>, por
  // exemplo), então quem foi movido ou redimensionado vira inline-block.
  if (!absolute && parts.length > 0) parts.push('display:inline-block');

  return parts;
}

/** Medidas tiradas do navegador para converter uma posição legada. */
export interface LayoutMeasures {
  elementWidth: number;
  elementHeight: number;
  sectionWidth: number;
  sectionHeight: number;
}

/**
 * Converte uma posição do sistema legado para o atual, preservando o ponto onde
 * o elemento está hoje na tela. Nada é descartado: o valor é recalculado a
 * partir das medidas reais no momento da conversão.
 *
 * Legado, elemento no fluxo: x era % da largura do elemento, y era % da altura.
 * Legado, elemento livre:    x era % da largura da seção, y era % da ALTURA.
 * Atual (os dois casos):     x e y em centésimos da LARGURA da seção.
 */
export function migrateLayout(
  layout: ElementLayout,
  measures: LayoutMeasures,
  absolute: boolean
): ElementLayout {
  if (layout.v === 2) return layout;
  if (measures.sectionWidth <= 0) return layout;

  const baseX = absolute ? measures.sectionWidth : measures.elementWidth;
  const baseY = absolute ? measures.sectionHeight : measures.elementHeight;

  const pxX = (layout.x / 100) * baseX;
  const pxY = (layout.y / 100) * baseY;

  return {
    ...layout,
    v: 2,
    x: Math.round((pxX / measures.sectionWidth) * 10000) / 100,
    y: Math.round((pxY / measures.sectionWidth) * 10000) / 100,
  };
}

/** Há posição legada aguardando conversão? */
export function hasLegacyLayouts(
  layouts: Record<string, LayoutPair>,
  overlays: Overlay[]
): boolean {
  const legacy = (layout: ElementLayout | null) =>
    Boolean(layout && layout.v === 1 && (layout.x !== 0 || layout.y !== 0));

  return (
    Object.values(layouts).some((pair) => legacy(pair.desktop) || legacy(pair.mobile)) ||
    overlays.some((item) => legacy(item.desktop) || legacy(item.mobile))
  );
}

/**
 * Folha de estilo com as posições livres gravadas no editor. Sai como um
 * `<style>` na página em vez de atributos inline: o HTML segue limpo e
 * semântico, e as regras de celular cabem num media query.
 */
export function layoutStylesheet(
  layouts: Record<string, LayoutPair>,
  overlays: Overlay[]
): string {
  const desktop: string[] = [];
  const mobile: string[] = [];

  const push = (selector: string, layout: ElementLayout, absolute: boolean, to: string[]) => {
    const declarations = layoutDeclarations(layout, absolute);
    if (declarations.length) to.push(`${selector}{${declarations.join(';')}}`);
  };

  for (const [path, pair] of Object.entries(layouts)) {
    if (!EDIT_PATH.test(path)) continue;
    const selector = `[data-edit="${path}"]`;
    push(selector, pair.desktop, false, desktop);
    if (pair.mobile) push(selector, pair.mobile, false, mobile);
  }

  for (const overlay of overlays) {
    const selector = `[data-overlay="${overlay.id}"]`;
    push(selector, overlay.desktop, true, desktop);
    if (overlay.mobile) push(selector, overlay.mobile, true, mobile);
  }

  const sheet: string[] = [];
  if (desktop.length) sheet.push(desktop.join('\n'));
  if (mobile.length) {
    sheet.push(`@media (max-width:${MOBILE_BREAKPOINT - 1}px){\n${mobile.join('\n')}\n}`);
  }
  return sheet.join('\n');
}
/** Caminho da Mídia ou URL https, sem aspas/parênteses que quebrem o `url(...)`. */
const MEDIA_PATH = /^(\/[\w\-./]*|https:\/\/[\w\-./?=&%]+)$/;

/**
 * Monta o `style` da seção a partir do que o editor gravou. Cada valor é
 * validado antes de virar CSS: o conteúdo vem do banco, e um valor inesperado
 * não pode escapar do atributo nem injetar outras declarações.
 */
export function sectionStyleAttr(style: SectionStyle | undefined): string | undefined {
  if (!style) return undefined;
  const parts: string[] = [];

  const bg = HEX.test(style.bg) ? style.bg : '';
  const image = MEDIA_PATH.test(style.image ?? '') ? style.image : '';
  const overlayValue = Number(style.overlay);
  const overlay =
    Number.isFinite(overlayValue) && overlayValue > 0 && overlayValue <= 100
      ? Math.round(overlayValue) / 100
      : 0;

  if (image) {
    const layers: string[] = [];
    if (overlay > 0) {
      layers.push(`linear-gradient(rgba(0,0,0,${overlay}),rgba(0,0,0,${overlay}))`);
    }
    layers.push(`url("${image}")`);
    parts.push(`background-image:${layers.join(',')}`);
    parts.push('background-size:cover');
    parts.push('background-position:center');
    if (bg) parts.push(`background-color:${bg}`);
  } else if (bg) {
    parts.push(`background:${bg}`);
  }

  if (HEX.test(style.text)) parts.push(`color:${style.text}`);
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
      layouts: normalizeLayouts(stored.layouts),
      overlays: normalizeOverlays(stored.overlays),
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
