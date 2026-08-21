/**
 * Autores das matérias — CRUD real no D1 (tabela `authors`).
 *
 * Foto (via Mídia/R2) ainda não é editável por aqui — `photo_id` permanece
 * nulo até a tela de Mídia estar conectada a um bucket real.
 */
import type { D1Database } from './cf-types';

export interface Author {
  id: number;
  name: string;
  role: string;
  bio: string;
  status: 'active' | 'inactive';
  initials: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthorRow {
  id: number;
  name: string;
  role: string;
  bio: string;
  status: string;
  created_at: string;
  updated_at: string;
}

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function rowToAuthor(row: AuthorRow): Author {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    bio: row.bio,
    status: row.status === 'active' ? 'active' : 'inactive',
    initials: initialsOf(row.name),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listAuthors(db: D1Database): Promise<Author[]> {
  const { results } = await db
    .prepare(
      `SELECT id, name, role, bio, status, created_at, updated_at FROM authors ORDER BY name ASC`
    )
    .all<AuthorRow>();
  return (results ?? []).map(rowToAuthor);
}

export async function getAuthor(db: D1Database, id: number): Promise<Author | null> {
  const row = await db
    .prepare(
      `SELECT id, name, role, bio, status, created_at, updated_at FROM authors WHERE id = ?1`
    )
    .bind(id)
    .first<AuthorRow>();
  return row ? rowToAuthor(row) : null;
}

export interface AuthorInput {
  name: string;
  role: string;
  bio: string;
  status: 'active' | 'inactive';
}

export async function createAuthor(db: D1Database, input: AuthorInput): Promise<void> {
  await db
    .prepare(`INSERT INTO authors (name, role, bio, status) VALUES (?1, ?2, ?3, ?4)`)
    .bind(input.name, input.role, input.bio, input.status)
    .run();
}

export async function updateAuthor(
  db: D1Database,
  id: number,
  input: AuthorInput
): Promise<void> {
  await db
    .prepare(
      `UPDATE authors SET name = ?1, role = ?2, bio = ?3, status = ?4, updated_at = datetime('now')
       WHERE id = ?5`
    )
    .bind(input.name, input.role, input.bio, input.status, id)
    .run();
}

/** Retorna false sem apagar se houver matérias vinculadas — inativar em vez de excluir. */
export async function deleteAuthor(db: D1Database, id: number): Promise<boolean> {
  const inUse = await db
    .prepare(`SELECT COUNT(*) AS n FROM posts WHERE author_id = ?1 AND deleted_at IS NULL`)
    .bind(id)
    .first<{ n: number }>();
  if ((inUse?.n ?? 0) > 0) return false;
  await db.prepare(`DELETE FROM authors WHERE id = ?1`).bind(id).run();
  return true;
}
