/**
 * GET /admin/api/estatisticas?period=today|7d|30d[&refresh=1]
 *
 * Só administrador. O middleware já exige sessão válida para /admin/*; aqui
 * conferimos o PAPEL (editor recebe 403, mesmo chamando a rota na mão).
 * O token da Cloudflare fica no servidor: a resposta traz só números agregados.
 */
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isAdmin } from '../../../lib/admin-guard';
import {
  AnalyticsError,
  CACHE_SECONDS,
  getAnalytics,
  parsePeriod,
  readConfig,
  type AnalyticsCache,
  type AnalyticsResult,
  type Period,
} from '../../../lib/analytics';

export const prerender = false;

const HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: HEADERS });

/** Cache da Cloudflare (por datacenter), 5 minutos por período. */
function edgeCache(): AnalyticsCache | undefined {
  if (typeof caches === 'undefined') return undefined;
  const keyOf = (period: Period) => new Request(`https://analytics-cache.invalid/estatisticas/${period}`);
  return {
    async get(period) {
      const hit = await (caches as unknown as { default: Cache }).default.match(keyOf(period));
      return hit ? ((await hit.json()) as AnalyticsResult) : null;
    },
    async put(period, value) {
      await (caches as unknown as { default: Cache }).default.put(
        keyOf(period),
        new Response(JSON.stringify(value), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${CACHE_SECONDS}` },
        })
      );
    },
  };
}

export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.user) return json({ error: 'unauthenticated' }, 401);
  if (!isAdmin(locals.user)) return json({ error: 'forbidden' }, 403);

  const config = readConfig(env);
  if (!config) return json({ configured: false });

  const period = parsePeriod(url.searchParams.get('period'));
  try {
    const data = await getAnalytics(config, period, {
      cache: edgeCache(),
      refresh: url.searchParams.get('refresh') === '1',
    });
    return json({ configured: true, ...data });
  } catch (error) {
    const known = error instanceof AnalyticsError;
    if (!known) console.error('[analytics] erro inesperado', error);
    return json(
      {
        configured: true,
        error: known ? error.code : 'api',
        message: known ? error.message : 'Não foi possível carregar as estatísticas no momento.',
      },
      502
    );
  }
};
