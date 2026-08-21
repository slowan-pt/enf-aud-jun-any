/**
 * Repositório da tabela `contacts` — formulário público e painel /admin/contatos.
 */
import type { D1Database } from './cf-types';

export type ContactStatus = 'novo' | 'em_atendimento' | 'respondido' | 'arquivado';

export interface ContactRow {
  id: number;
  name: string;
  company: string;
  role: string;
  email: string;
  phone: string;
  org_type: string;
  service: string;
  subject: string;
  message: string;
  origin: string;
  consent: number;
  status: ContactStatus;
  internal_note: string;
  ip: string;
  created_at: string;
  updated_at: string;
}

export interface NewContact {
  name: string;
  company: string;
  role: string;
  email: string;
  phone: string;
  orgType: string;
  service: string;
  subject: string;
  message: string;
  origin: string;
  consent: boolean;
  ip: string;
}

export async function insertContact(db: D1Database, c: NewContact): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO contacts
        (name, company, role, email, phone, org_type, service, subject, message, origin, consent, ip)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`
    )
    .bind(
      c.name,
      c.company,
      c.role,
      c.email,
      c.phone,
      c.orgType,
      c.service,
      c.subject,
      c.message,
      c.origin,
      c.consent ? 1 : 0,
      c.ip
    )
    .run();
  return Number((result.meta as { last_row_id?: number }).last_row_id ?? 0);
}

/** Limite simples por IP: no máx. 5 envios a cada 60 minutos. */
export async function isRateLimited(
  db: D1Database,
  ip: string,
  max = 5,
  windowMinutes = 60
): Promise<boolean> {
  const row = await db
    .prepare(`SELECT attempts, window_start FROM contact_rate_limit WHERE ip = ?1`)
    .bind(ip)
    .first<{ attempts: number; window_start: string }>();

  if (!row) {
    await db
      .prepare(
        "INSERT INTO contact_rate_limit (ip, attempts, window_start) VALUES (?1, 1, datetime('now'))"
      )
      .bind(ip)
      .run();
    return false;
  }

  const expired = await db
    .prepare(`SELECT 1 AS x WHERE ?1 < datetime('now', ?2)`)
    .bind(row.window_start, `-${windowMinutes} minutes`)
    .first<{ x: number }>();

  if (expired) {
    await db
      .prepare(
        "UPDATE contact_rate_limit SET attempts = 1, window_start = datetime('now') WHERE ip = ?1"
      )
      .bind(ip)
      .run();
    return false;
  }

  if (row.attempts >= max) return true;

  await db
    .prepare('UPDATE contact_rate_limit SET attempts = attempts + 1 WHERE ip = ?1')
    .bind(ip)
    .run();
  return false;
}

export async function listContacts(db: D1Database): Promise<ContactRow[]> {
  const { results } = await db
    .prepare('SELECT * FROM contacts ORDER BY created_at DESC')
    .all<ContactRow>();
  return results;
}

export async function getContact(db: D1Database, id: number): Promise<ContactRow | null> {
  const row = await db
    .prepare('SELECT * FROM contacts WHERE id = ?1')
    .bind(id)
    .first<ContactRow>();
  return row ?? null;
}

export async function updateContactStatus(
  db: D1Database,
  id: number,
  status: ContactStatus,
  note?: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE contacts SET status = ?1, internal_note = COALESCE(?2, internal_note), updated_at = datetime('now')
       WHERE id = ?3`
    )
    .bind(status, note ?? null, id)
    .run();
}

export async function countContactsByStatus(
  db: D1Database
): Promise<Record<ContactStatus, number>> {
  const { results } = await db
    .prepare('SELECT status, COUNT(*) AS n FROM contacts GROUP BY status')
    .all<{ status: ContactStatus; n: number }>();
  const out: Record<ContactStatus, number> = {
    novo: 0,
    em_atendimento: 0,
    respondido: 0,
    arquivado: 0,
  };
  for (const r of results) out[r.status] = r.n;
  return out;
}
