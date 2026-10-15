import { describe, expect, it, vi } from 'vitest';
import { createSqliteD1 } from './helpers/sqlite-d1';

const bucket = vi.hoisted(() => {
  const store = new Map<string, { body: ArrayBuffer; type: string }>();
  return {
    store,
    api: {
      put: async (key: string, value: ArrayBuffer, opts?: { httpMetadata?: { contentType?: string } }) => {
        store.set(key, { body: value, type: opts?.httpMetadata?.contentType ?? '' });
        return {};
      },
      get: async (key: string) => {
        const hit = store.get(key);
        return hit ? { body: hit.body, size: hit.body.byteLength } : null;
      },
      head: async (key: string) => (store.has(key) ? {} : null),
    },
  };
});

vi.mock('../src/lib/media', () => ({ getBucket: () => bucket.api }));
const dbHolder = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('../src/lib/db', () => ({
  getDB: () => dbHolder.db,
  writeAuditLog: async () => undefined,
}));

import {
  DEFAULT_PORTFOLIO_FILES,
  normalizePortfolioFiles,
  pageImageUrls,
  pdfKeyFor,
  sniffKind,
} from '../src/lib/portfolio-files';
import { PORTFOLIO_PDF_KEY } from '../src/lib/portfolio';
import { getSettings } from '../src/lib/settings';
import { POST as upload } from '../src/pages/admin/api/portfolio-arquivo';
import { POST as publish } from '../src/pages/admin/api/portfolio-publicar';
import { GET as serveImage } from '../src/pages/portfolio/img/[version]/[file]';

const SCHEMA = `CREATE TABLE settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_by INTEGER, updated_at TEXT NOT NULL DEFAULT (datetime('now')));`;

const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50]);
const PDF = new TextEncoder().encode('%PDF-1.7 conteudo');
const user = { id: 1, name: 'Admin', role: 'admin' };

function sendFile(fields: Record<string, string>, bytes: Uint8Array, asUser: unknown = user) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  form.append('file', new File([bytes as BlobPart], 'x'));
  return upload({ request: new Request('https://x/admin/api/portfolio-arquivo', { method: 'POST', body: form }), locals: { user: asUser } } as never);
}
const publishWith = (body: unknown, asUser: unknown = user) =>
  publish({
    request: new Request('https://x/admin/api/portfolio-publicar', { method: 'POST', body: JSON.stringify(body) }),
    locals: { user: asUser },
  } as never);

describe('arquivos do portfólio (lógica)', () => {
  it('sem nada salvo usa o portfólio original (7 páginas, PDF de sempre)', () => {
    expect(normalizePortfolioFiles(undefined)).toEqual(DEFAULT_PORTFOLIO_FILES);
    expect(pageImageUrls(DEFAULT_PORTFOLIO_FILES)[0]).toBe('/portfolio/pagina-1.webp');
    expect(pdfKeyFor(DEFAULT_PORTFOLIO_FILES)).toBe(PORTFOLIO_PDF_KEY);
  });

  it('versão enviada muda endereços e PDF; valores absurdos voltam ao padrão', () => {
    const files = normalizePortfolioFiles({ version: 'abc123xyz', pageCount: 3, ratio: 1.5 });
    expect(pageImageUrls(files)).toEqual([1, 2, 3].map((n) => `/portfolio/img/abc123xyz/pagina-${n}.webp`));
    expect(pdfKeyFor(files)).toBe('portfolio/vabc123xyz/portfolio.pdf');
    expect(normalizePortfolioFiles({ version: '../x', pageCount: 3 })).toEqual(DEFAULT_PORTFOLIO_FILES);
    expect(normalizePortfolioFiles({ version: 'abc123xyz', pageCount: 999, ratio: 99 })).toMatchObject({
      pageCount: DEFAULT_PORTFOLIO_FILES.pageCount,
      ratio: DEFAULT_PORTFOLIO_FILES.ratio,
    });
  });

  it('reconhece WebP e PDF pelos bytes', () => {
    expect(sniffKind(WEBP)).toBe('webp');
    expect(sniffKind(PDF)).toBe('pdf');
    expect(sniffKind(new TextEncoder().encode('<script>'))).toBeNull();
  });
});

describe('enviar e publicar um PDF novo', () => {
  it('só publica depois de TODOS os arquivos chegarem, e só aí o site muda', async () => {
    dbHolder.db = createSqliteD1(SCHEMA);
    const version = 'testv1abc';

    // sem sessão
    expect((await sendFile({ version, name: 'pagina-1.webp' }, WEBP, null)).status).toBe(401);
    // arquivo falso disfarçado de imagem / nome malicioso
    expect((await sendFile({ version, name: 'pagina-1.webp' }, new TextEncoder().encode('<html>'))).status).toBe(422);
    expect((await sendFile({ version, name: '../../x.webp' }, WEBP)).status).toBe(422);
    expect((await sendFile({ version: '../x', name: 'pagina-1.webp' }, WEBP)).status).toBe(422);
    expect((await sendFile({ version, name: 'portfolio.pdf' }, WEBP)).status).toBe(422);

    // envia 1 página (normal + zoom) mas esquece o PDF → recusa e nada muda
    expect((await sendFile({ version, name: 'pagina-1.webp' }, WEBP)).status).toBe(200);
    expect((await sendFile({ version, name: 'zoom-1.webp' }, WEBP)).status).toBe(200);
    const early = await publishWith({ version, pageCount: 1, ratio: 0.7 });
    expect(early.status).toBe(422);
    expect((await getSettings(dbHolder.db as never)).portfolio).toEqual(DEFAULT_PORTFOLIO_FILES);

    // completa com o PDF → publica
    expect((await sendFile({ version, name: 'portfolio.pdf' }, PDF)).status).toBe(200);
    expect((await publishWith({ version, pageCount: 1, ratio: 0.7 }, null)).status).toBe(401);
    expect((await publishWith({ version, pageCount: 1, ratio: 0.7 })).status).toBe(200);
    expect((await getSettings(dbHolder.db as never)).portfolio).toEqual({ version, pageCount: 1, ratio: 0.7 });

    // a imagem é servida; o PDF nunca sai por essa rota
    const img = await serveImage({ params: { version, file: 'pagina-1.webp' } } as never);
    expect(img.status).toBe(200);
    expect(img.headers.get('Content-Type')).toBe('image/webp');
    expect((await serveImage({ params: { version, file: 'portfolio.pdf' } } as never)).status).toBe(404);
    expect((await serveImage({ params: { version: '..', file: 'pagina-1.webp' } } as never)).status).toBe(404);

    // volta ao original
    expect((await publishWith({ restore: true })).status).toBe(200);
    expect((await getSettings(dbHolder.db as never)).portfolio).toEqual(DEFAULT_PORTFOLIO_FILES);
  });
});

describe('download do PDF (baixar.ts) segue o PDF vigente', () => {
  it('serve o PDF original por padrão, o enviado quando há versão, e cai no original se faltar', async () => {
    const { readFileSync } = await import('node:fs');
    const { GET: download } = await import('../src/pages/portfolio/baixar');
    const { createPortfolioRequest, approveRequest } = await import('../src/lib/portfolio');
    const migration = readFileSync(new URL('../migrations/0013_portfolio_requests.sql', import.meta.url), 'utf8');
    const db = createSqliteD1(migration);
    dbHolder.db = db;

    const { id } = await createPortfolioRequest(db, { name: 'Ana', email: 'a@x.com', phone: '11999990000', company: 'X', role: 'Y', ip: '1' });
    const token = (await approveRequest(db, id))!.download_token;
    const call = (files: unknown) =>
      download({ url: new URL(`https://x/portfolio/baixar?token=${token}`), locals: { settings: { portfolio: files } } } as never);
    const text = async (res: Response) => new TextDecoder().decode(await res.arrayBuffer());

    bucket.store.set(PORTFOLIO_PDF_KEY, { body: new TextEncoder().encode('%PDF-ORIGINAL').buffer as ArrayBuffer, type: 'application/pdf' });
    expect(await text(await call(DEFAULT_PORTFOLIO_FILES))).toContain('ORIGINAL');

    const novo = { version: 'novo123abc', pageCount: 2, ratio: 0.7 };
    // versão apontada mas arquivo ainda ausente → não quebra, entrega o original
    expect(await text(await call(novo))).toContain('ORIGINAL');
    bucket.store.set('portfolio/vnovo123abc/portfolio.pdf', { body: new TextEncoder().encode('%PDF-NOVO').buffer as ArrayBuffer, type: 'application/pdf' });
    const res = await call(novo);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(await text(res)).toContain('NOVO');
  });
});

describe('texto do topo do Portfólio', () => {
  it('padrão, edição salva e texto vazio volta ao padrão', async () => {
    const { DEFAULT_PORTFOLIO_HERO, normalizePortfolioHero } = await import('../src/lib/portfolio-files');
    const { updateSetting } = await import('../src/lib/settings');
    const db = createSqliteD1(SCHEMA);
    expect((await getSettings(db)).portfolioHero).toEqual(DEFAULT_PORTFOLIO_HERO);

    await updateSetting(db, 'portfolioHero', normalizePortfolioHero({ eyebrow: 'Novo', title: 'Nosso portfólio', lead: '' }));
    expect((await getSettings(db)).portfolioHero).toEqual({
      eyebrow: 'Novo',
      title: 'Nosso portfólio',
      lead: DEFAULT_PORTFOLIO_HERO.lead,
    });
  });
});

describe('textos do site (antes fixos)', () => {
  it('sem edição, os textos são exatamente os de antes; edição vale; vazio volta ao original', async () => {
    const { DEFAULT_SITE_TEXTS, normalizeSiteTexts } = await import('../src/lib/site-texts');
    const { updateSetting } = await import('../src/lib/settings');
    const db = createSqliteD1(SCHEMA);
    const base = (await getSettings(db)).siteTexts;
    expect(base).toEqual(DEFAULT_SITE_TEXTS);
    expect(base.header.ctaLabel).toBe('Fale com a Essencial');
    expect(base.footer.contactTitle).toBe('Contato');

    await updateSetting(
      db,
      'siteTexts',
      normalizeSiteTexts({ header: { ctaLabel: 'Fale conosco', ctaHref: 'javascript:alert(1)' }, footer: { about: '  Novo texto  ', linksTitle: '' } })
    );
    const next = (await getSettings(db)).siteTexts;
    expect(next.header.ctaLabel).toBe('Fale conosco');
    expect(next.header.ctaHref).toBe('/contato'); // link perigoso é recusado
    expect(next.footer.about).toBe('Novo texto');
    expect(next.footer.linksTitle).toBe('Links rápidos');
    expect(next.careers).toEqual(DEFAULT_SITE_TEXTS.careers);
  });
});
