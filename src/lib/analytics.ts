/**
 * Estatísticas de acesso do site, lidas da Cloudflare GraphQL Analytics API.
 *
 * Roda SÓ no servidor (o token nunca chega ao navegador). Cada bloco do painel
 * (países, dispositivos, navegadores...) é uma consulta independente: se a
 * Cloudflare não oferecer um campo para o plano/zona atual, só aquele bloco
 * some — o resto continua funcionando. Nada aqui inventa números.
 */

export type Period = 'today' | '7d' | '30d';
export const PERIODS: Period[] = ['today', '7d', '30d'];

export function parsePeriod(value: string | null | undefined): Period {
  return PERIODS.includes(value as Period) ? (value as Period) : '7d';
}

export interface AnalyticsConfig {
  token: string;
  zoneId: string;
}

export type AnalyticsErrorCode = 'auth' | 'range' | 'api' | 'network';

/** Erro com mensagem segura para o painel (nunca carrega token nem resposta bruta). */
export class AnalyticsError extends Error {
  constructor(
    public code: AnalyticsErrorCode,
    message: string
  ) {
    super(message);
  }
}

export interface Row {
  key: string;
  label: string;
  visits: number;
  requests: number;
  percent: number;
}

export interface TimelinePoint {
  t: string;
  visits: number;
  requests: number;
  pageviews: number | null;
}

export interface BotRow {
  name: string;
  visits: number;
  requests: number;
}

export interface AnalyticsResult {
  period: Period;
  generatedAt: string;
  range: { from: string; to: string; bucket: 'hour' | 'day' };
  visits: number;
  requests: number;
  pageviews: number | null;
  /** Visitas menos o tráfego automatizado CONHECIDO — é estimativa, ver `humanNote`. */
  humanVisits: number | null;
  automatedVisits: number | null;
  timeline: TimelinePoint[];
  countries: Row[];
  devices: Row[];
  browsers: Row[];
  operatingSystems: Row[];
  pages: Row[];
  bots: BotRow[];
  /** Blocos que a Cloudflare não entregou (campo indisponível no plano, erro...). */
  unavailable: { section: string; reason: string }[];
}

// ---------------------------------------------------------------- período

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Brasília não tem mais horário de verão: UTC-3 fixo. */
const BRT = -3 * HOUR;

export function periodRange(period: Period, now: Date): { from: Date; to: Date; bucket: 'hour' | 'day' } {
  if (period === 'today') {
    const local = new Date(now.getTime() + BRT);
    const startLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
    return { from: new Date(startLocal - BRT), to: now, bucket: 'hour' };
  }
  const days = period === '7d' ? 7 : 30;
  return { from: new Date(now.getTime() - days * DAY), to: now, bucket: 'day' };
}

// ------------------------------------------------------------ GraphQL

const ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql';

interface Section {
  dimension: string;
  /** Filtros extras (literais fixos escritos aqui, nunca vindos do usuário). */
  extra?: string;
  limit: number;
  order: string;
  sums?: boolean;
}

function buildQuery(cfg: AnalyticsConfig, range: { from: Date; to: Date }, s: Section): string {
  const filter = `{ datetime_geq: "${range.from.toISOString()}", datetime_leq: "${range.to.toISOString()}", requestSource: "eyeball"${s.extra ? `, ${s.extra}` : ''} }`;
  return `query { viewer { zones(filter: { zoneTag: "${cfg.zoneId}" }) {
    rows: httpRequestsAdaptiveGroups(limit: ${s.limit}, filter: ${filter}, orderBy: [${s.order}]) {
      count
      sum { visits }
      dimensions { ${s.dimension} }
    }
  } } }`;
}

interface RawRow {
  count: number;
  sum?: { visits?: number };
  dimensions: Record<string, string>;
}

function classifyFailure(status: number, messages: string[]): AnalyticsError {
  const text = messages.join(' ').toLowerCase();
  if (status === 401 || status === 403 || /authentication|not authorized|permission|unauthorized/.test(text)) {
    return new AnalyticsError('auth', 'A Cloudflare recusou o token. Confira as permissões (Analytics: leitura).');
  }
  if (/time range|too (wide|large|old)|limited to|exceeds|retention|start date|before/.test(text)) {
    return new AnalyticsError('range', 'O plano da Cloudflare não permite consultar um período tão longo.');
  }
  return new AnalyticsError('api', 'A Cloudflare não respondeu como esperado.');
}

async function runSection(
  cfg: AnalyticsConfig,
  range: { from: Date; to: Date },
  s: Section,
  fetchImpl: typeof fetch
): Promise<RawRow[]> {
  let response: Response;
  try {
    response = await fetchImpl(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: buildQuery(cfg, range, s) }),
    });
  } catch {
    throw new AnalyticsError('network', 'Não foi possível falar com a Cloudflare.');
  }

  let payload: {
    data?: { viewer?: { zones?: { rows?: RawRow[] }[] } };
    errors?: { message?: string }[] | null;
  } | null = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const messages = (payload?.errors ?? []).map((e) => e.message ?? '');
  if (!response.ok || messages.length > 0 || !payload?.data) {
    // Diagnóstico só no log do servidor (sem o token).
    console.error('[analytics] falha na consulta', s.dimension, response.status, messages.join(' | ').slice(0, 300));
    throw classifyFailure(response.status, messages);
  }
  const zone = payload.data.viewer?.zones?.[0];
  if (!zone) throw new AnalyticsError('api', 'Zona não encontrada. Confira o CLOUDFLARE_ZONE_ID.');
  return zone.rows ?? [];
}

// ---------------------------------------------------------- bots / nomes

/**
 * Tráfego automatizado CONHECIDO, por User-Agent. Lista deliberadamente
 * conservadora: só entra o que se identifica como robô/ferramenta. Robôs
 * disfarçados de navegador não são detectáveis aqui (a Cloudflare só entrega
 * pontuação de bot em planos Enterprise), por isso "humanos" é estimativa.
 */
const KNOWN_BOTS: [RegExp, string][] = [
  [/censys/i, 'Censys'],
  [/palo ?alto|expanse/i, 'Palo Alto Networks'],
  [/googlebot|google-inspectiontool|apis-google|adsbot-google|mediapartners-google|googleother/i, 'Google (rastreador)'],
  [/bingbot|bingpreview|msnbot/i, 'Bing (rastreador)'],
  [/applebot/i, 'Applebot'],
  [/ahrefsbot/i, 'AhrefsBot'],
  [/semrushbot/i, 'SemrushBot'],
  [/mj12bot|dotbot|petalbot|yandexbot|baiduspider|duckduckbot|bytespider|amazonbot|dataforseo/i, 'Rastreadores de busca/SEO'],
  [/gptbot|chatgpt-user|oai-searchbot|claudebot|claude-web|ccbot|perplexitybot|anthropic-ai/i, 'Rastreadores de IA'],
  [/facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|whatsapp|skypeuripreview/i, 'Pré-visualização de links'],
  [/uptimerobot|pingdom|statuscake|site24x7|betterstack|healthcheck/i, 'Monitoramento'],
  [/zgrab|masscan|nmap|nuclei|sqlmap|nikto|wpscan|netcraft|internet-measurement|security ?scanner|shodan|leakix|projectdiscovery/i, 'Scanners de segurança'],
  [/curl\/|wget\/|python-requests|python-urllib|aiohttp|go-http-client|java\/\d|libwww-perl|node-fetch|axios\/|httpclient|scrapy|headlesschrome|phantomjs/i, 'Scripts e ferramentas HTTP'],
];
const GENERIC_BOT = /(^|[^a-z])(bot|crawler|spider|scanner|crawl)([^a-z]|$)|\+https?:\/\//i;

export function classifyUserAgent(ua: string): { bot: boolean; name: string } {
  const text = (ua ?? '').trim();
  if (!text) return { bot: true, name: 'Sem User-Agent' };
  for (const [pattern, name] of KNOWN_BOTS) if (pattern.test(text)) return { bot: true, name };
  if (GENERIC_BOT.test(text)) return { bot: true, name: 'Outros robôs' };
  return { bot: false, name: '' };
}

const PAGE_NAMES: Record<string, string> = {
  '/': 'Página Inicial',
  '/quem-somos': 'Quem Somos',
  '/servicos': 'Serviços',
  '/conteudos': 'Conteúdos',
  '/contato': 'Contato',
  '/portfolio': 'Portfólio',
  '/trabalhe-conosco': 'Trabalhe conosco',
  '/politica-de-privacidade': 'Política de Privacidade',
};

export function friendlyPath(path: string): string {
  const clean = path.length > 1 ? path.replace(/\/+$/, '') : path;
  if (PAGE_NAMES[clean]) return PAGE_NAMES[clean];
  const [, section, rest] = clean.match(/^\/(servicos|conteudos)\/(.+)$/) ?? [];
  if (section && rest) return `${section === 'servicos' ? 'Serviço' : 'Matéria'}: ${rest.replace(/-/g, ' ')}`;
  return clean;
}

const DEVICE_LABELS: Record<string, string> = {
  desktop: 'Computador',
  mobile: 'Celular',
  tablet: 'Tablet',
};

function countryLabel(code: string): string {
  if (!code || code === 'XX') return 'Desconhecido';
  if (code === 'T1') return 'Rede Tor';
  try {
    return new Intl.DisplayNames(['pt-BR'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

// ------------------------------------------------------------ montagem

function toRows(
  raw: RawRow[],
  dimension: string,
  metric: 'visits' | 'requests',
  label: (key: string) => string,
  top = 8
): Row[] {
  const merged = new Map<string, { visits: number; requests: number }>();
  for (const r of raw) {
    const key = r.dimensions[dimension] ?? '';
    const prev = merged.get(key) ?? { visits: 0, requests: 0 };
    prev.visits += r.sum?.visits ?? 0;
    prev.requests += r.count ?? 0;
    merged.set(key, prev);
  }
  const all = [...merged.entries()]
    .map(([key, v]) => ({ key, label: label(key), ...v, percent: 0 }))
    .sort((a, b) => b[metric] - a[metric]);
  const total = all.reduce((sum, r) => sum + r[metric], 0);
  let rows = all;
  if (all.length > top) {
    const rest = all.slice(top);
    rows = [
      ...all.slice(0, top),
      {
        key: '__other',
        label: 'Outros',
        visits: rest.reduce((s, r) => s + r.visits, 0),
        requests: rest.reduce((s, r) => s + r.requests, 0),
        percent: 0,
      },
    ];
  }
  for (const r of rows) r.percent = total ? Math.round((r[metric] / total) * 1000) / 10 : 0;
  return rows.filter((r) => r[metric] > 0);
}

function fillTimeline(
  all: RawRow[],
  html: RawRow[] | null,
  dimension: 'datetimeHour' | 'date',
  range: { from: Date; to: Date }
): TimelinePoint[] {
  const key = (r: RawRow) => r.dimensions[dimension] ?? '';
  const a = new Map(all.map((r) => [key(r), r]));
  const h = html ? new Map(html.map((r) => [key(r), r])) : null;
  const points: TimelinePoint[] = [];
  const step = dimension === 'datetimeHour' ? HOUR : DAY;
  let cursor = Math.floor(range.from.getTime() / step) * step;
  for (; cursor <= range.to.getTime(); cursor += step) {
    const iso = new Date(cursor).toISOString();
    const t = dimension === 'datetimeHour' ? iso.slice(0, 19) + 'Z' : iso.slice(0, 10);
    const row = a.get(t) ?? a.get(iso) ?? a.get(iso.slice(0, 19) + 'Z');
    const hrow = h ? (h.get(t) ?? h.get(iso)) : undefined;
    points.push({
      t,
      visits: row?.sum?.visits ?? 0,
      requests: row?.count ?? 0,
      pageviews: h ? (hrow?.count ?? 0) : null,
    });
  }
  return points;
}

const HTML_FILTER = 'edgeResponseContentTypeName: "html", edgeResponseStatus_lt: 400';

export async function fetchAnalytics(
  cfg: AnalyticsConfig,
  period: Period,
  opts: { now?: Date; fetchImpl?: typeof fetch } = {}
): Promise<AnalyticsResult> {
  const now = opts.now ?? new Date();
  const fetchImpl = opts.fetchImpl ?? fetch;
  const range = periodRange(period, now);
  const timeDim = range.bucket === 'hour' ? 'datetimeHour' : 'date';
  const timeOrder = `${timeDim}_ASC`;

  const sections = {
    timeline: { dimension: timeDim, limit: 1000, order: timeOrder },
    pageviewsTimeline: { dimension: timeDim, extra: HTML_FILTER, limit: 1000, order: timeOrder },
    countries: { dimension: 'clientCountryName', limit: 250, order: 'sum_visits_DESC' },
    devices: { dimension: 'clientDeviceType', limit: 20, order: 'sum_visits_DESC' },
    browsers: { dimension: 'userAgentBrowser', limit: 100, order: 'sum_visits_DESC' },
    operatingSystems: { dimension: 'userAgentOS', limit: 100, order: 'sum_visits_DESC' },
    pages: { dimension: 'clientRequestPath', extra: HTML_FILTER, limit: 200, order: 'count_DESC' },
    userAgents: { dimension: 'userAgent', limit: 500, order: 'sum_visits_DESC' },
  } satisfies Record<string, Section>;

  const names = Object.keys(sections) as (keyof typeof sections)[];
  const settled = await Promise.allSettled(names.map((n) => runSection(cfg, range, sections[n], fetchImpl)));
  const out = {} as Record<keyof typeof sections, RawRow[] | null>;
  const unavailable: AnalyticsResult['unavailable'] = [];
  const SECTION_LABELS: Record<string, string> = {
    pageviewsTimeline: 'Visualizações de página',
    countries: 'Países',
    devices: 'Dispositivos',
    browsers: 'Navegadores',
    operatingSystems: 'Sistemas operacionais',
    pages: 'Páginas mais acessadas',
    userAgents: 'Tráfego automatizado',
  };

  settled.forEach((result, index) => {
    const name = names[index]!;
    if (result.status === 'fulfilled') {
      out[name] = result.value;
      return;
    }
    out[name] = null;
    const error = result.reason as AnalyticsError;
    // Sem o gráfico principal não há painel: propaga o erro (auth/plano/rede).
    if (name === 'timeline') throw error instanceof AnalyticsError ? error : new AnalyticsError('api', 'Falha inesperada.');
    unavailable.push({ section: SECTION_LABELS[name] ?? name, reason: error.message });
  });

  const timelineRaw = out.timeline ?? [];
  const timeline = fillTimeline(timelineRaw, out.pageviewsTimeline, timeDim, range);
  const visits = timeline.reduce((s, p) => s + p.visits, 0);
  const requests = timeline.reduce((s, p) => s + p.requests, 0);
  const pageviews = out.pageviewsTimeline ? timeline.reduce((s, p) => s + (p.pageviews ?? 0), 0) : null;

  // Tráfego automatizado conhecido, agrupado por nome.
  let bots: BotRow[] = [];
  let automatedVisits: number | null = null;
  let humanVisits: number | null = null;
  if (out.userAgents) {
    const grouped = new Map<string, BotRow>();
    for (const r of out.userAgents) {
      const verdict = classifyUserAgent(r.dimensions.userAgent ?? '');
      if (!verdict.bot) continue;
      const row = grouped.get(verdict.name) ?? { name: verdict.name, visits: 0, requests: 0 };
      row.visits += r.sum?.visits ?? 0;
      row.requests += r.count ?? 0;
      grouped.set(verdict.name, row);
    }
    bots = [...grouped.values()].sort((a, b) => b.requests - a.requests);
    automatedVisits = Math.min(
      visits,
      bots.reduce((s, b) => s + b.visits, 0)
    );
    humanVisits = Math.max(0, visits - automatedVisits);
  }

  return {
    period,
    generatedAt: now.toISOString(),
    range: { from: range.from.toISOString(), to: range.to.toISOString(), bucket: range.bucket },
    visits,
    requests,
    pageviews,
    humanVisits,
    automatedVisits,
    timeline,
    countries: out.countries ? toRows(out.countries, 'clientCountryName', 'visits', countryLabel) : [],
    devices: out.devices ? toRows(out.devices, 'clientDeviceType', 'visits', (k) => DEVICE_LABELS[k] ?? 'Outros') : [],
    browsers: out.browsers ? toRows(out.browsers, 'userAgentBrowser', 'visits', (k) => k || 'Outros') : [],
    operatingSystems: out.operatingSystems
      ? toRows(out.operatingSystems, 'userAgentOS', 'visits', (k) => k || 'Outros')
      : [],
    pages: out.pages ? toRows(out.pages, 'clientRequestPath', 'requests', friendlyPath, 10) : [],
    bots,
    unavailable,
  };
}

// ---------------------------------------------------------------- cache

export const CACHE_SECONDS = 300;
/** "Atualizar" não refaz a consulta se os dados têm menos que isto. */
export const REFRESH_MIN_SECONDS = 60;

export interface AnalyticsCache {
  get(period: Period): Promise<AnalyticsResult | null>;
  put(period: Period, value: AnalyticsResult): Promise<void>;
}

export async function getAnalytics(
  cfg: AnalyticsConfig,
  period: Period,
  opts: { cache?: AnalyticsCache; refresh?: boolean; now?: Date; fetchImpl?: typeof fetch } = {}
): Promise<AnalyticsResult> {
  const now = opts.now ?? new Date();
  if (opts.cache) {
    const hit = await opts.cache.get(period).catch(() => null);
    if (hit) {
      const age = (now.getTime() - new Date(hit.generatedAt).getTime()) / 1000;
      const limit = opts.refresh ? REFRESH_MIN_SECONDS : CACHE_SECONDS;
      if (age >= 0 && age < limit) return hit;
    }
  }
  const fresh = await fetchAnalytics(cfg, period, { now, fetchImpl: opts.fetchImpl });
  if (opts.cache) await opts.cache.put(period, fresh).catch(() => undefined);
  return fresh;
}

const ZONE_RE = /^[0-9a-f]{32}$/i;

/** Lê e valida a configuração; devolve null enquanto o Analytics não foi configurado. */
export function readConfig(env: { CLOUDFLARE_API_TOKEN?: string; CLOUDFLARE_ZONE_ID?: string }): AnalyticsConfig | null {
  const token = (env.CLOUDFLARE_API_TOKEN ?? '').trim();
  const zoneId = (env.CLOUDFLARE_ZONE_ID ?? '').trim();
  if (!token || !ZONE_RE.test(zoneId)) return null;
  return { token, zoneId };
}
