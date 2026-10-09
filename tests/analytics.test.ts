import { describe, expect, it, vi } from 'vitest';

const envMock = vi.hoisted(() => ({ CLOUDFLARE_API_TOKEN: '', CLOUDFLARE_ZONE_ID: '' }));
vi.mock('cloudflare:workers', () => ({ env: envMock }));

import {
  AnalyticsError,
  classifyUserAgent,
  fetchAnalytics,
  friendlyPath,
  getAnalytics,
  parsePeriod,
  periodRange,
  readConfig,
  type AnalyticsResult,
} from '../src/lib/analytics';
import { GET } from '../src/pages/admin/api/estatisticas';

const CFG = { token: 'tok_SECRET_123', zoneId: 'a'.repeat(32) };
const NOW = new Date('2026-10-09T15:00:00Z');

type Rows = Record<string, unknown>[];
/** Cloudflare falsa: devolve linhas conforme a dimensão pedida na consulta. */
function fakeCloudflare(byDimension: Record<string, Rows | 'error'>) {
  return vi.fn(async (_url: unknown, init?: RequestInit) => {
    const query = String(JSON.parse(String(init?.body)).query);
    const dim = /dimensions \{ (\w+) \}/.exec(query)![1]!;
    const html = query.includes('edgeResponseContentTypeName');
    const key = html && byDimension[`${dim}:html`] ? `${dim}:html` : dim;
    const rows = byDimension[key];
    if (rows === 'error' || rows === undefined) {
      return new Response(JSON.stringify({ data: null, errors: [{ message: 'unknown field' }] }), { status: 200 });
    }
    return new Response(JSON.stringify({ data: { viewer: { zones: [{ rows }] } } }), { status: 200 });
  }) as unknown as typeof fetch;
}

const row = (dimension: string, value: string, count: number, visits: number) => ({
  count,
  sum: { visits },
  dimensions: { [dimension]: value },
});

const goodData: Record<string, Rows | 'error'> = {
  date: [row('date', '2026-10-08', 40, 10), row('date', '2026-10-09', 20, 6)],
  'date:html': [row('date', '2026-10-08', 15, 0), row('date', '2026-10-09', 9, 0)],
  clientCountryName: [row('clientCountryName', 'BR', 50, 12), row('clientCountryName', 'US', 10, 4)],
  clientDeviceType: [row('clientDeviceType', 'desktop', 30, 9), row('clientDeviceType', 'mobile', 30, 7)],
  userAgentBrowser: [row('userAgentBrowser', 'Chrome', 50, 13), row('userAgentBrowser', '', 10, 3)],
  userAgentOS: [row('userAgentOS', 'Windows', 40, 10)],
  clientRequestPath: [row('clientRequestPath', '/', 9, 0), row('clientRequestPath', '/servicos', 5, 0)],
  userAgent: [
    row('userAgent', 'Mozilla/5.0 (Windows NT 10.0) Chrome/120', 50, 11),
    row('userAgent', 'Mozilla/5.0 (compatible; CensysInspect/1.1)', 6, 3),
    row('userAgent', 'Mozilla/5.0 (compatible; Palo Alto Networks)', 4, 2),
  ],
};

describe('analytics: período e classificação', () => {
  it('período inválido cai em 7 dias', () => {
    expect(parsePeriod('x')).toBe('7d');
    expect(parsePeriod('today')).toBe('today');
    expect(parsePeriod(null)).toBe('7d');
  });

  it('"hoje" começa à meia-noite de Brasília e agrupa por hora', () => {
    const r = periodRange('today', NOW);
    expect(r.bucket).toBe('hour');
    expect(r.from.toISOString()).toBe('2026-10-09T03:00:00.000Z');
  });

  it('7 e 30 dias agrupam por dia', () => {
    expect(periodRange('7d', NOW).bucket).toBe('day');
    expect(NOW.getTime() - periodRange('30d', NOW).from.getTime()).toBe(30 * 86_400_000);
  });

  it('identifica robôs conhecidos e não confunde gente com robô', () => {
    expect(classifyUserAgent('Mozilla/5.0 (compatible; CensysInspect/1.1; +https://about.censys.io/)').name).toBe('Censys');
    expect(classifyUserAgent('Mozilla/5.0 (Palo Alto Networks Cortex Xpanse)').name).toBe('Palo Alto Networks');
    expect(classifyUserAgent('python-requests/2.31').bot).toBe(true);
    expect(classifyUserAgent('').name).toBe('Sem User-Agent');
    expect(classifyUserAgent('Mozilla/5.0 (Linux; Android 13; CUBOT_X) AppleWebKit/537.36 Chrome/120 Mobile').bot).toBe(false);
    expect(classifyUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64) Chrome/120 Safari/537.36').bot).toBe(false);
    expect(classifyUserAgent('Mozilla/5.0 YaBrowser/23.9 Safari/537.36').bot).toBe(false);
  });

  it('dá nomes amigáveis às páginas', () => {
    expect(friendlyPath('/')).toBe('Página Inicial');
    expect(friendlyPath('/quem-somos/')).toBe('Quem Somos');
    expect(friendlyPath('/conteudos/janela-de-oportunidade')).toBe('Matéria: janela de oportunidade');
    expect(friendlyPath('/qualquer')).toBe('/qualquer');
  });

  it('só considera configurado com token e zona (32 hex)', () => {
    expect(readConfig({})).toBeNull();
    expect(readConfig({ CLOUDFLARE_API_TOKEN: 't', CLOUDFLARE_ZONE_ID: 'curta' })).toBeNull();
    expect(readConfig({ CLOUDFLARE_API_TOKEN: 't', CLOUDFLARE_ZONE_ID: 'a'.repeat(32) })).toEqual({
      token: 't',
      zoneId: 'a'.repeat(32),
    });
  });
});

describe('analytics: consulta à Cloudflare', () => {
  it('normaliza visitas, páginas, humanos e robôs sem vazar o token', async () => {
    const fetchImpl = fakeCloudflare(goodData);
    const result = await fetchAnalytics(CFG, '7d', { now: NOW, fetchImpl });

    expect(result.visits).toBe(16);
    expect(result.requests).toBe(60);
    expect(result.pageviews).toBe(24);
    expect(result.automatedVisits).toBe(5);
    expect(result.humanVisits).toBe(11);
    expect(result.bots.map((b) => b.name)).toEqual(['Censys', 'Palo Alto Networks']);
    expect(result.countries[0]).toMatchObject({ key: 'BR', label: 'Brasil', percent: 75 });
    expect(result.devices.map((d) => d.label)).toEqual(['Computador', 'Celular']);
    expect(result.browsers.map((b) => b.label)).toContain('Outros');
    expect(result.pages[0]).toMatchObject({ label: 'Página Inicial', requests: 9 });
    expect(result.timeline).toHaveLength(8);
    expect(result.unavailable).toEqual([]);

    expect(JSON.stringify(result)).not.toContain('SECRET');
    const calls = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0]![1]!.headers).toMatchObject({ Authorization: 'Bearer tok_SECRET_123' });
  });

  it('um bloco indisponível não derruba o painel e não inventa número', async () => {
    const result = await fetchAnalytics(CFG, '7d', {
      now: NOW,
      fetchImpl: fakeCloudflare({ ...goodData, userAgent: 'error' }),
    });
    expect(result.humanVisits).toBeNull();
    expect(result.automatedVisits).toBeNull();
    expect(result.unavailable.map((u) => u.section)).toContain('Tráfego automatizado');
    expect(result.visits).toBe(16);
  });

  it('erro de autenticação vira mensagem amigável, sem token', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 403 })) as unknown as typeof fetch;
    const error = await fetchAnalytics(CFG, '7d', { now: NOW, fetchImpl }).catch((e) => e);
    expect(error).toBeInstanceOf(AnalyticsError);
    expect(error.code).toBe('auth');
    expect(error.message).not.toContain('SECRET');
  });

  it('cache de 5 minutos; "atualizar" só refaz após 1 minuto', async () => {
    const store = new Map<string, AnalyticsResult>();
    const cache = {
      get: async (p: string) => store.get(p) ?? null,
      put: async (p: string, v: AnalyticsResult) => void store.set(p, v),
    };
    const fetchImpl = fakeCloudflare(goodData);
    const calls = () => (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls.length;

    await getAnalytics(CFG, '7d', { cache: cache as never, now: NOW, fetchImpl });
    const first = calls();
    await getAnalytics(CFG, '7d', { cache: cache as never, now: new Date(NOW.getTime() + 200_000), fetchImpl });
    expect(calls()).toBe(first);
    await getAnalytics(CFG, '7d', { cache: cache as never, refresh: true, now: new Date(NOW.getTime() + 30_000), fetchImpl });
    expect(calls()).toBe(first);
    await getAnalytics(CFG, '7d', { cache: cache as never, refresh: true, now: new Date(NOW.getTime() + 90_000), fetchImpl });
    expect(calls()).toBeGreaterThan(first);
  });
});

describe('rota /admin/api/estatisticas: só administrador', () => {
  const call = (user: unknown) =>
    GET({ locals: { user }, url: new URL('https://x.com/admin/api/estatisticas') } as never);

  it('sem sessão: 401; editor: 403; admin sem configuração: avisa que falta configurar', async () => {
    expect((await call(undefined)).status).toBe(401);
    expect((await call({ id: 1, role: 'editor' })).status).toBe(403);
    const admin = await call({ id: 1, role: 'admin' });
    expect(admin.status).toBe(200);
    expect(await admin.json()).toEqual({ configured: false });
    expect(admin.headers.get('Cache-Control')).toContain('no-store');
  });
});
