/**
 * Cor dos cards — leitura e gravação (ver src/lib/card-style.ts).
 *
 *  GET  → { tones, all, overrides }
 *  POST → { op: 'set', key, color }   cor de UM card (color = null volta ao tom geral)
 *         { op: 'all', color }        aplica em TODOS os cards e limpa as exceções
 */
import type { APIRoute } from 'astro';
import { getDB, writeAuditLog } from '../../../lib/db';
import { updateSetting } from '../../../lib/settings';
import {
  CARD_TONES,
  isCardKey,
  isTone,
  normalizeCardStyle,
  type CardStyle,
} from '../../../lib/card-style';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) return json({ error: 'Não autenticado.' }, 401);
  return json({ tones: CARD_TONES, ...normalizeCardStyle(locals.settings.cardStyle) });
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return json({ error: 'Não autenticado.' }, 401);

  let payload: { op?: unknown; key?: unknown; color?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'JSON inválido.' }, 400);
  }

  const current = normalizeCardStyle(locals.settings.cardStyle);
  let next: CardStyle;

  if (payload.op === 'all') {
    if (!isTone(payload.color)) return json({ error: 'Cor inválida.' }, 422);
    next = { all: payload.color as string, overrides: {} };
  } else if (payload.op === 'set') {
    if (!isCardKey(payload.key)) return json({ error: 'Card inválido.' }, 422);
    const overrides = { ...current.overrides };
    if (payload.color === null) {
      delete overrides[payload.key];
    } else if (isTone(payload.color)) {
      overrides[payload.key] = payload.color as string;
    } else {
      return json({ error: 'Cor inválida.' }, 422);
    }
    next = { all: current.all, overrides };
  } else {
    return json({ error: 'Operação inválida.' }, 422);
  }

  const db = getDB();
  await updateSetting(db, 'cardStyle', normalizeCardStyle(next), locals.user.id);
  await writeAuditLog(db, {
    userId: locals.user.id,
    userName: locals.user.name,
    action: 'settings.card_style',
    target: payload.op === 'all' ? `Cor dos cards: todos → ${payload.color}` : `Cor do card ${payload.key}`,
    ip: request.headers.get('cf-connecting-ip') ?? '',
  });
  return json({ ok: true, ...normalizeCardStyle(next) });
};
