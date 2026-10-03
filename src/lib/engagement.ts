/**
 * Comentários das matérias (com moderação) e inscritos para receber novas
 * publicações. Tabelas: post_comments, newsletter_subscribers,
 * engagement_rate_limit (migration 0010).
 */
import type { D1Database } from './cf-types';

export type CommentStatus = 'pendente' | 'aprovado' | 'rejeitado';

export interface PostComment {
  id: number;
  post_id: number;
  name: string;
  email: string;
  body: string;
  status: CommentStatus;
  reply: string;
  created_at: string;
}

export interface AdminComment extends PostComment {
  post_title: string | null;
  post_slug: string | null;
}

export interface Subscriber {
  id: number;
  name: string;
  token: string;
  email: string;
  status: 'ativo' | 'cancelado';
  source: string;
  created_at: string;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export const COMMENT_LIMITS = { nameMin: 2, nameMax: 80, bodyMin: 10, bodyMax: 1500 };

/** Limite simples por chave (ex.: "comment:IP"): no máx. `max` envios a cada `windowMinutes`. */
export async function hitRateLimit(
  db: D1Database,
  key: string,
  max: number,
  windowMinutes = 60
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT attempts, (window_start < datetime('now', ?2)) AS expired
         FROM engagement_rate_limit WHERE key = ?1`
    )
    .bind(key, `-${windowMinutes} minutes`)
    .first<{ attempts: number; expired: number }>();

  if (!row || row.expired) {
    await db
      .prepare(
        `INSERT INTO engagement_rate_limit (key, attempts, window_start)
         VALUES (?1, 1, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET attempts = 1, window_start = datetime('now')`
      )
      .bind(key)
      .run();
    return false;
  }

  if (row.attempts >= max) return true;

  await db
    .prepare('UPDATE engagement_rate_limit SET attempts = attempts + 1 WHERE key = ?1')
    .bind(key)
    .run();
  return false;
}

export async function isPublishedPost(db: D1Database, postId: number): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 AS ok FROM posts WHERE id = ?1 AND status = 'published' AND deleted_at IS NULL`
    )
    .bind(postId)
    .first<{ ok: number }>();
  return Boolean(row);
}

export async function insertComment(
  db: D1Database,
  c: { postId: number; name: string; email: string; body: string; ip: string }
): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO post_comments (post_id, name, email, body, ip)
       VALUES (?1, ?2, ?3, ?4, ?5)`
    )
    .bind(c.postId, c.name, c.email, c.body, c.ip)
    .run();
  return Number(result.meta.last_row_id);
}

/** Só comentários aprovados aparecem no site (o e-mail nunca é exposto). */
export async function listApprovedComments(
  db: D1Database,
  postId: number
): Promise<Pick<PostComment, 'id' | 'name' | 'body' | 'reply' | 'created_at'>[]> {
  try {
    const { results } = await db
      .prepare(
        `SELECT id, name, body, reply, created_at FROM post_comments
          WHERE post_id = ?1 AND status = 'aprovado'
          ORDER BY created_at ASC, id ASC LIMIT 200`
      )
      .bind(postId)
      .all<Pick<PostComment, 'id' | 'name' | 'body' | 'reply' | 'created_at'>>();
    return results;
  } catch {
    return [];
  }
}

export async function listCommentsForAdmin(
  db: D1Database,
  status?: CommentStatus
): Promise<AdminComment[]> {
  const where = status ? 'WHERE c.status = ?1' : '';
  const stmt = db.prepare(
    `SELECT c.*, p.title AS post_title, p.slug AS post_slug
       FROM post_comments c LEFT JOIN posts p ON p.id = c.post_id
       ${where}
       ORDER BY c.created_at DESC, c.id DESC LIMIT 500`
  );
  const { results } = await (status ? stmt.bind(status) : stmt).all<AdminComment>();
  return results;
}

export async function countCommentsByStatus(
  db: D1Database
): Promise<Record<CommentStatus, number>> {
  const out: Record<CommentStatus, number> = { pendente: 0, aprovado: 0, rejeitado: 0 };
  const { results } = await db
    .prepare('SELECT status, COUNT(*) AS n FROM post_comments GROUP BY status')
    .all<{ status: CommentStatus; n: number }>();
  for (const r of results) if (r.status in out) out[r.status] = r.n;
  return out;
}

export async function moderateComment(
  db: D1Database,
  id: number,
  status: CommentStatus,
  reply?: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE post_comments
          SET status = ?1, reply = COALESCE(?2, reply), updated_at = datetime('now')
        WHERE id = ?3`
    )
    .bind(status, reply ?? null, id)
    .run();
}

export async function deleteComment(db: D1Database, id: number): Promise<void> {
  await db.prepare('DELETE FROM post_comments WHERE id = ?1').bind(id).run();
}

function newToken(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

/**
 * Inscrição idempotente: o mesmo e-mail nunca duplica, quem tinha cancelado volta
 * a ficar ativo, e o token de cancelamento é mantido (links antigos continuam valendo).
 */
export async function addSubscriber(
  db: D1Database,
  s: { email: string; name?: string; source: string; ip: string }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO newsletter_subscribers (email, name, token, source, ip)
       VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT(email) DO UPDATE SET
         status = 'ativo',
         name = CASE WHEN excluded.name <> '' THEN excluded.name ELSE name END,
         updated_at = datetime('now')`
    )
    .bind(s.email.toLowerCase(), s.name ?? '', newToken(), s.source, s.ip)
    .run();
}

export async function getSubscriberByToken(
  db: D1Database,
  token: string
): Promise<Pick<Subscriber, 'id' | 'email' | 'name' | 'status'> | null> {
  if (!/^[0-9a-f]{32}$/.test(token)) return null;
  return db
    .prepare('SELECT id, email, name, status FROM newsletter_subscribers WHERE token = ?1')
    .bind(token)
    .first<Pick<Subscriber, 'id' | 'email' | 'name' | 'status'>>();
}

/** Cancelamento pelo link do e-mail. Devolve false se o token não existe. */
export async function unsubscribeByToken(db: D1Database, token: string): Promise<boolean> {
  const row = await getSubscriberByToken(db, token);
  if (!row) return false;
  await setSubscriberStatus(db, row.id, 'cancelado');
  return true;
}

export async function listSubscribers(db: D1Database): Promise<Subscriber[]> {
  const { results } = await db
    .prepare(
      'SELECT id, name, token, email, status, source, created_at FROM newsletter_subscribers ORDER BY created_at DESC, id DESC'
    )
    .all<Subscriber>();
  return results;
}

export async function setSubscriberStatus(
  db: D1Database,
  id: number,
  status: 'ativo' | 'cancelado'
): Promise<void> {
  await db
    .prepare(
      "UPDATE newsletter_subscribers SET status = ?1, updated_at = datetime('now') WHERE id = ?2"
    )
    .bind(status, id)
    .run();
}

export async function deleteSubscriber(db: D1Database, id: number): Promise<void> {
  await db.prepare('DELETE FROM newsletter_subscribers WHERE id = ?1').bind(id).run();
}

/** CSV (UTF-8 com BOM, para abrir certo no Excel) só dos inscritos ativos. */
export function subscribersToCsv(rows: Subscriber[], siteUrl = ''): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = ['nome,email,origem,inscrito_em,link_cancelar'];
  for (const r of rows) {
    if (r.status !== 'ativo') continue;
    const unsub = siteUrl ? `${siteUrl}/cancelar-inscricao?token=${r.token}` : '';
    lines.push([esc(r.name), esc(r.email), esc(r.source), esc(r.created_at), esc(unsub)].join(','));
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}
