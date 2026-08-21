/**
 * Usuários do painel — CRUD real no D1 (tabela `users`).
 *
 * Não há convite por e-mail ainda (depende do e-mail transacional, ver
 * notify.ts) — o administrador define a senha inicial diretamente ao criar
 * o usuário, que é armazenada só como hash (PBKDF2), nunca em texto plano.
 */
import type { D1Database } from './cf-types';
import { hashPassword } from './auth';

export interface AdminUserRow {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'editor';
  status: 'active' | 'inactive';
  lastLoginAt: string | null;
  createdAt: string;
}

interface UserRow {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  last_login_at: string | null;
  created_at: string;
}

function rowToUser(row: UserRow): AdminUserRow {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role === 'admin' ? 'admin' : 'editor',
    status: row.status === 'active' ? 'active' : 'inactive',
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  };
}

export async function listUsers(db: D1Database): Promise<AdminUserRow[]> {
  const { results } = await db
    .prepare(
      `SELECT id, name, email, role, status, last_login_at, created_at FROM users ORDER BY name ASC`
    )
    .all<UserRow>();
  return (results ?? []).map(rowToUser);
}

export async function countActiveAdmins(db: D1Database): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND status = 'active'`)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function emailExists(db: D1Database, email: string): Promise<boolean> {
  const row = await db.prepare(`SELECT id FROM users WHERE email = ?1`).bind(email).first();
  return Boolean(row);
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'editor';
}

export async function createUser(db: D1Database, input: CreateUserInput): Promise<void> {
  const { hash, salt } = await hashPassword(input.password);
  await db
    .prepare(
      `INSERT INTO users (name, email, password_hash, password_salt, role, status)
       VALUES (?1, ?2, ?3, ?4, ?5, 'active')`
    )
    .bind(input.name, input.email, hash, salt, input.role)
    .run();
}

export interface UpdateUserInput {
  name: string;
  email: string;
  role: 'admin' | 'editor';
  status: 'active' | 'inactive';
}

export async function updateUser(
  db: D1Database,
  id: number,
  input: UpdateUserInput
): Promise<void> {
  await db
    .prepare(
      `UPDATE users SET name = ?1, email = ?2, role = ?3, status = ?4, updated_at = datetime('now')
       WHERE id = ?5`
    )
    .bind(input.name, input.email, input.role, input.status, id)
    .run();
}

export async function resetPassword(
  db: D1Database,
  id: number,
  password: string
): Promise<void> {
  const { hash, salt } = await hashPassword(password);
  await db
    .prepare(
      `UPDATE users SET password_hash = ?1, password_salt = ?2, updated_at = datetime('now') WHERE id = ?3`
    )
    .bind(hash, salt, id)
    .run();
}
