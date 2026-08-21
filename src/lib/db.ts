/**
 * Acesso ao D1 a partir de rotas/páginas Astro.
 * Uso: const db = getDB();
 *
 * O binding vem do módulo nativo `cloudflare:workers` (não mais de
 * `Astro.locals.runtime.env`, removido nesta versão do adapter). Funciona
 * tanto em `astro dev` quanto em produção — em ambos os casos o Vite plugin
 * da Cloudflare roda o código dentro do runtime real (workerd), então o
 * binding declarado em wrangler.jsonc já está disponível.
 */
import { env } from 'cloudflare:workers';
import type { D1Database } from './cf-types';

export function getDB(): D1Database {
  if (!env.DB) {
    throw new Error(
      'Binding D1 "DB" não encontrado. Confira o wrangler.jsonc (d1_databases) e rode as ' +
        'migrations locais: npx wrangler d1 execute essencial-saude-db --local --file=migrations/0001_init.sql'
    );
  }
  return env.DB;
}

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  password_salt: string;
  role: 'admin' | 'editor';
  status: 'active' | 'inactive';
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function findUserByEmail(db: D1Database, email: string): Promise<UserRow | null> {
  const row = await db
    .prepare('SELECT * FROM users WHERE email = ?1 COLLATE NOCASE')
    .bind(email.trim())
    .first<UserRow>();
  return row ?? null;
}

export async function touchUserLogin(db: D1Database, userId: number): Promise<void> {
  await db
    .prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?1")
    .bind(userId)
    .run();
}

export async function recordLoginAttempt(
  db: D1Database,
  email: string,
  ip: string,
  success: boolean
): Promise<void> {
  await db
    .prepare('INSERT INTO login_attempts (email, ip, success) VALUES (?1, ?2, ?3)')
    .bind(email.trim(), ip, success ? 1 : 0)
    .run();
}

/** Conta tentativas malsucedidas recentes — usado para bloquear força bruta. */
export async function recentFailedAttempts(
  db: D1Database,
  email: string,
  ip: string,
  windowMinutes = 15
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM login_attempts
       WHERE success = 0 AND created_at >= datetime('now', ?1)
       AND (email = ?2 COLLATE NOCASE OR ip = ?3)`
    )
    .bind(`-${windowMinutes} minutes`, email.trim(), ip)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function createSession(
  db: D1Database,
  id: string,
  userId: number,
  expiresAt: string
): Promise<void> {
  await db
    .prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?1, ?2, ?3)')
    .bind(id, userId, expiresAt)
    .run();
}

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'editor';
}

export async function getSessionUser(
  db: D1Database,
  sessionId: string
): Promise<SessionUser | null> {
  const row = await db
    .prepare(
      `SELECT u.id, u.name, u.email, u.role, u.status
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ?1 AND s.expires_at > datetime('now')`
    )
    .bind(sessionId)
    .first<SessionUser & { status: string }>();
  if (!row || row.status !== 'active') return null;
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

export async function deleteSession(db: D1Database, sessionId: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE id = ?1').bind(sessionId).run();
}

export async function writeAuditLog(
  db: D1Database,
  entry: { userId?: number; userName: string; action: string; target?: string; ip?: string }
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO audit_logs (user_id, user_name, action, target, ip) VALUES (?1, ?2, ?3, ?4, ?5)'
    )
    .bind(
      entry.userId ?? null,
      entry.userName,
      entry.action,
      entry.target ?? '',
      entry.ip ?? ''
    )
    .run();
}

export interface AuditLogEntry {
  id: number;
  at: string;
  user: string;
  action: string;
  target: string;
  ip: string;
}

interface AuditLogRow {
  id: number;
  created_at: string;
  user_name: string;
  action: string;
  target: string;
  ip: string;
}

export async function listAuditLogs(db: D1Database, limit = 200): Promise<AuditLogEntry[]> {
  const { results } = await db
    .prepare(
      `SELECT id, created_at, user_name, action, target, ip FROM audit_logs
       ORDER BY created_at DESC LIMIT ?1`
    )
    .bind(limit)
    .all<AuditLogRow>();
  return (results ?? []).map((row) => ({
    id: row.id,
    at: row.created_at,
    user: row.user_name || '—',
    action: row.action,
    target: row.target,
    ip: row.ip,
  }));
}
