/**
 * Redirecionamentos administráveis — CRUD real no D1 (tabela `redirects`),
 * aplicados de verdade no middleware para qualquer rota pública.
 */
import type { D1Database } from './cf-types';

export interface Redirect {
  id: number;
  from: string;
  to: string;
  code: 301 | 302;
  hits: number;
  createdAt: string;
}

interface RedirectRow {
  id: number;
  from_path: string;
  to_path: string;
  status_code: number;
  hits: number;
  created_at: string;
}

function rowToRedirect(row: RedirectRow): Redirect {
  return {
    id: row.id,
    from: row.from_path,
    to: row.to_path,
    code: row.status_code === 302 ? 302 : 301,
    hits: row.hits,
    createdAt: row.created_at,
  };
}

export async function listRedirects(db: D1Database): Promise<Redirect[]> {
  const { results } = await db
    .prepare(`SELECT * FROM redirects ORDER BY created_at DESC`)
    .all<RedirectRow>();
  return (results ?? []).map(rowToRedirect);
}

export async function findRedirect(db: D1Database, fromPath: string): Promise<Redirect | null> {
  const row = await db
    .prepare(`SELECT * FROM redirects WHERE from_path = ?1`)
    .bind(fromPath)
    .first<RedirectRow>();
  return row ? rowToRedirect(row) : null;
}

export async function recordHit(db: D1Database, id: number): Promise<void> {
  await db.prepare(`UPDATE redirects SET hits = hits + 1 WHERE id = ?1`).bind(id).run();
}

export interface RedirectInput {
  from: string;
  to: string;
  code: 301 | 302;
}

export async function createRedirect(db: D1Database, input: RedirectInput): Promise<void> {
  await db
    .prepare(
      `INSERT INTO redirects (from_path, to_path, status_code) VALUES (?1, ?2, ?3)
       ON CONFLICT(from_path) DO UPDATE SET to_path = excluded.to_path, status_code = excluded.status_code`
    )
    .bind(input.from, input.to, input.code)
    .run();
}

export async function deleteRedirect(db: D1Database, id: number): Promise<void> {
  await db.prepare(`DELETE FROM redirects WHERE id = ?1`).bind(id).run();
}
