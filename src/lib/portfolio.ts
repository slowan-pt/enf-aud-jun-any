/**
 * Pedidos de download do Portfólio (tabela portfolio_requests, migration 0013).
 *
 * Fluxo: visitante pede → fica "pendente" → a Essencial aprova ou recusa →
 * só se aprovado nasce um link de download com prazo, enviado ao e-mail que a
 * pessoa informou no pedido.
 */
import type { D1Database } from './cf-types';

export type PortfolioStatus = 'pendente' | 'aprovado' | 'recusado';

export interface PortfolioRequest {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  status: PortfolioStatus;
  approve_token: string;
  download_token: string;
  download_expires: string | null;
  downloads: number;
  mail_sent: number;
  created_at: string;
  decided_at: string | null;
}

/** Quantos dias o link de download enviado ao solicitante continua válido. */
export const DOWNLOAD_VALID_DAYS = 7;

export const PORTFOLIO_PDF_KEY = 'portfolio/Portfolio_Essencial_Saude_Auditoria.pdf';
export const PORTFOLIO_PDF_FILENAME = 'Portfolio_Essencial_Saude_Auditoria.pdf';

export const TOKEN_RE = /^[0-9a-f]{32}$/;

export function newToken(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

export async function createPortfolioRequest(
  db: D1Database,
  r: { name: string; email: string; phone: string; company: string; role: string; ip: string }
): Promise<{ id: number; approveToken: string }> {
  const approveToken = newToken();
  const result = await db
    .prepare(
      `INSERT INTO portfolio_requests (name, email, phone, company, role, approve_token, ip)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
    )
    .bind(r.name, r.email.toLowerCase(), r.phone, r.company, r.role, approveToken, r.ip)
    .run();
  return { id: Number(result.meta.last_row_id), approveToken };
}

export async function getByApproveToken(
  db: D1Database,
  token: string
): Promise<PortfolioRequest | null> {
  if (!TOKEN_RE.test(token)) return null;
  return db
    .prepare('SELECT * FROM portfolio_requests WHERE approve_token = ?1')
    .bind(token)
    .first<PortfolioRequest>();
}

export async function getPortfolioRequest(
  db: D1Database,
  id: number
): Promise<PortfolioRequest | null> {
  return db
    .prepare('SELECT * FROM portfolio_requests WHERE id = ?1')
    .bind(id)
    .first<PortfolioRequest>();
}

/** Pedido com link de download VÁLIDO (aprovado e dentro do prazo). */
export async function getByValidDownloadToken(
  db: D1Database,
  token: string
): Promise<PortfolioRequest | null> {
  if (!TOKEN_RE.test(token)) return null;
  return db
    .prepare(
      `SELECT * FROM portfolio_requests
        WHERE download_token = ?1 AND status = 'aprovado'
          AND download_expires IS NOT NULL AND download_expires > datetime('now')`
    )
    .bind(token)
    .first<PortfolioRequest>();
}

/**
 * Aprova: gera o link de download (novo token e novo prazo) e devolve o pedido
 * atualizado. Aprovar de novo gera um link novo (serve para "reenviar").
 */
export async function approveRequest(
  db: D1Database,
  id: number
): Promise<PortfolioRequest | null> {
  const token = newToken();
  await db
    .prepare(
      `UPDATE portfolio_requests
          SET status = 'aprovado', download_token = ?1,
              download_expires = datetime('now', ?2), decided_at = datetime('now')
        WHERE id = ?3`
    )
    .bind(token, `+${DOWNLOAD_VALID_DAYS} days`, id)
    .run();
  return getPortfolioRequest(db, id);
}

/** Recusa: derruba qualquer link de download que já existisse. */
export async function refuseRequest(db: D1Database, id: number): Promise<void> {
  await db
    .prepare(
      `UPDATE portfolio_requests
          SET status = 'recusado', download_token = '', download_expires = NULL,
              decided_at = datetime('now')
        WHERE id = ?1`
    )
    .bind(id)
    .run();
}

export async function markMailSent(db: D1Database, id: number): Promise<void> {
  await db.prepare('UPDATE portfolio_requests SET mail_sent = 1 WHERE id = ?1').bind(id).run();
}

export async function countDownload(db: D1Database, id: number): Promise<void> {
  await db
    .prepare('UPDATE portfolio_requests SET downloads = downloads + 1 WHERE id = ?1')
    .bind(id)
    .run();
}

export async function listPortfolioRequests(db: D1Database): Promise<PortfolioRequest[]> {
  const { results } = await db
    .prepare('SELECT * FROM portfolio_requests ORDER BY created_at DESC, id DESC LIMIT 500')
    .all<PortfolioRequest>();
  return results;
}

export async function countPendingPortfolio(db: D1Database): Promise<number> {
  try {
    const row = await db
      .prepare("SELECT COUNT(*) AS n FROM portfolio_requests WHERE status = 'pendente'")
      .first<{ n: number }>();
    return row?.n ?? 0;
  } catch {
    return 0;
  }
}
