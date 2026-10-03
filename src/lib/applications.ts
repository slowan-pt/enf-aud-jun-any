/**
 * Repositório de `job_applications` — currículos enviados em /trabalhe-conosco.
 * O PDF em si fica no R2 (`r2_key`); a tabela guarda só os metadados.
 */
import type { D1Database } from './cf-types';

export interface JobApplication {
  id: number;
  name: string;
  email: string;
  phone: string;
  message: string;
  r2_key: string;
  filename: string;
  size_bytes: number;
  email_sent: number;
  created_at: string;
}

export interface NewJobApplication {
  name: string;
  email: string;
  phone: string;
  message: string;
  r2Key: string;
  filename: string;
  sizeBytes: number;
  ip: string;
}

export async function insertApplication(db: D1Database, a: NewJobApplication): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO job_applications (name, email, phone, message, r2_key, filename, size_bytes, ip)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
    )
    .bind(a.name, a.email, a.phone, a.message, a.r2Key, a.filename, a.sizeBytes, a.ip)
    .run();
  return Number(result.meta.last_row_id);
}

export async function markApplicationEmailed(db: D1Database, id: number): Promise<void> {
  await db.prepare('UPDATE job_applications SET email_sent = 1 WHERE id = ?1').bind(id).run();
}

export async function listApplications(db: D1Database): Promise<JobApplication[]> {
  const { results } = await db
    .prepare('SELECT * FROM job_applications ORDER BY created_at DESC, id DESC LIMIT 500')
    .all<JobApplication>();
  return results;
}

export async function getApplication(db: D1Database, id: number): Promise<JobApplication | null> {
  return db
    .prepare('SELECT * FROM job_applications WHERE id = ?1')
    .bind(id)
    .first<JobApplication>();
}
