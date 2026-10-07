/** Pedidos do Portfólio: aprovação, prazo do link e revogação (SQLite real). */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createSqliteD1 } from './helpers/sqlite-d1';
import {
  approveRequest,
  countDownload,
  countPendingPortfolio,
  createPortfolioRequest,
  getByApproveToken,
  getByValidDownloadToken,
  refuseRequest,
  listPortfolioRequests,
  TOKEN_RE,
} from '../src/lib/portfolio';

const MIGRATION = readFileSync(new URL('../migrations/0013_portfolio_requests.sql', import.meta.url), 'utf8');
const fresh = () => createSqliteD1(MIGRATION);
const person = { name: 'Ana Souza', email: 'Ana@Exemplo.com', phone: '11999990000', company: 'Hospital X', role: 'Gestora', ip: '1.1.1.1' };

describe('portfólio', () => {
  it('pedido nasce pendente, com e-mail em minúsculas e token de decisão válido', async () => {
    const db = fresh();
    const { id, approveToken } = await createPortfolioRequest(db, person);
    expect(approveToken).toMatch(TOKEN_RE);
    expect(await countPendingPortfolio(db)).toBe(1);
    const found = await getByApproveToken(db, approveToken);
    expect(found).toMatchObject({ id, status: 'pendente', email: 'ana@exemplo.com' });
    expect(await getByApproveToken(db, 'x')).toBeNull();
  });

  it('pendente não baixa; aprovado baixa; revogado deixa de baixar', async () => {
    const db = fresh();
    const { id } = await createPortfolioRequest(db, person);
    const approved = await approveRequest(db, id);
    expect(approved?.status).toBe('aprovado');
    const token = approved!.download_token;
    expect(token).toMatch(TOKEN_RE);
    expect((await getByValidDownloadToken(db, token))?.id).toBe(id);

    await countDownload(db, id);
    expect((await listPortfolioRequests(db))[0].downloads).toBe(1);

    await refuseRequest(db, id);
    expect(await getByValidDownloadToken(db, token)).toBeNull();
  });

  it('link vencido não baixa e aprovar de novo gera link novo', async () => {
    const db = fresh();
    const { id } = await createPortfolioRequest(db, person);
    const first = (await approveRequest(db, id))!.download_token;
    await db.prepare("UPDATE portfolio_requests SET download_expires = datetime('now','-1 minute') WHERE id = ?1").bind(id).run();
    expect(await getByValidDownloadToken(db, first)).toBeNull();
    const second = (await approveRequest(db, id))!.download_token;
    expect(second).not.toBe(first);
    expect(await getByValidDownloadToken(db, first)).toBeNull();
    expect(await getByValidDownloadToken(db, second)).not.toBeNull();
  });
});
