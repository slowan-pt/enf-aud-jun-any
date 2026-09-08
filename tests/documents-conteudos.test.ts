/**
 * Página de Conteúdos (/conteudos) — a grade de matérias em si vem da
 * tabela `posts` (gerida em Conteúdo → Matérias); este documento cobre só
 * a abertura (hero) e a chamada final (cta). Mesma família de garantias
 * das outras páginas migradas: normalização, fallback e isolamento.
 */
import { describe, it, expect } from 'vitest';
import {
  getConteudosContent,
  updateConteudosContent,
  getPoliticaContent,
  CONTEUDOS_SECTION_KEYS,
  CONTEUDOS_SLUG,
} from '../src/lib/documents';
import type { D1Database } from '../src/lib/cf-types';

function fakeDb(rows: Record<string, string | null> = {}) {
  const db = {
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          return {
            async first() {
              const slug = params[0] as string;
              const json = rows[slug];
              return json == null
                ? null
                : { id: 1, sections_json: json, updated_at: '2026-01-01' };
            },
            async run() {
              const slug = String(params[0]);
              const json = String(params[1]);
              rows[slug] = json;
            },
          };
        },
      };
    },
  } as unknown as D1Database;
  return { db, rows };
}

describe('getConteudosContent — fallback e normalização', () => {
  it('sem registro salvo, cai no padrão (hero + cta + 3 seções)', async () => {
    const { db } = fakeDb();
    const content = await getConteudosContent(db);
    expect(content.sectionOrder).toEqual([...CONTEUDOS_SECTION_KEYS]);
    expect(content.hero.title.length).toBeGreaterThan(0);
    expect(content.cta.title.length).toBeGreaterThan(0);
  });

  it('JSON corrompido não derruba a página', async () => {
    const { db } = fakeDb({ [CONTEUDOS_SLUG]: '{ isto não é json' });
    const content = await getConteudosContent(db);
    expect(content.hero.title.length).toBeGreaterThan(0);
  });

  it('carrega hero e cta salvos, sem inventar nem descartar campos', async () => {
    const salvo = JSON.stringify({
      hero: { eyebrow: 'Blog', title: 'Título editado', lead: 'Lead editado' },
      cta: { eyebrow: 'Fale', title: 'CTA editado', text: 'Texto editado' },
    });
    const { db } = fakeDb({ [CONTEUDOS_SLUG]: salvo });
    const content = await getConteudosContent(db);
    expect(content.hero).toEqual({
      eyebrow: 'Blog',
      title: 'Título editado',
      lead: 'Lead editado',
    });
    expect(content.cta).toEqual({
      eyebrow: 'Fale',
      title: 'CTA editado',
      text: 'Texto editado',
    });
  });

  it('campo de hero/cta ausente cai no valor padrão daquele campo, sem afetar os demais', async () => {
    const salvo = JSON.stringify({ hero: { title: 'Só o título mudou' } });
    const { db } = fakeDb({ [CONTEUDOS_SLUG]: salvo });
    const content = await getConteudosContent(db);
    expect(content.hero.title).toBe('Só o título mudou');
    expect(content.hero.eyebrow).toBe('Conteúdos');
  });

  it('recusa chave de seção que não pertence a esta página', async () => {
    const salvo = JSON.stringify({ sectionOrder: ['list', 'destaque', 'grade', 'cta'] });
    const { db } = fakeDb({ [CONTEUDOS_SLUG]: salvo });
    const content = await getConteudosContent(db);
    expect(content.sectionOrder).not.toContain('list');
    expect(content.sectionOrder).toEqual(expect.arrayContaining([...CONTEUDOS_SECTION_KEYS]));
  });
});

describe('isolamento entre Conteúdos e Política de Privacidade', () => {
  it('salvar Conteúdos não afeta a linha da Política', async () => {
    const { db, rows } = fakeDb({
      [CONTEUDOS_SLUG]: JSON.stringify({ hero: { title: 'Antes' } }),
      '/politica-de-privacidade': JSON.stringify({ noteText: 'Nota original' }),
    });
    const current = await getConteudosContent(db);
    await updateConteudosContent(db, {
      ...current,
      hero: { ...current.hero, title: 'Depois' },
    });

    expect(JSON.parse(rows[CONTEUDOS_SLUG]!).hero.title).toBe('Depois');
    expect(JSON.parse(rows['/politica-de-privacidade']!).noteText).toBe('Nota original');

    const politica = await getPoliticaContent(db);
    expect(politica.noteText).toBe('Nota original');
  });

  it('salvar hero/cta não descarta overlays já existentes no registro salvo', async () => {
    const salvo = JSON.stringify({
      hero: { title: 'Antes' },
      overlays: [{ id: 'ov-1', section: 'grade', kind: 'text', content: 'Olá' }],
    });
    const { db } = fakeDb({ [CONTEUDOS_SLUG]: salvo });
    const current = await getConteudosContent(db);
    expect(current.overlays).toHaveLength(1);
    expect(current.overlays[0].id).toBe('ov-1');

    await updateConteudosContent(db, {
      ...current,
      hero: { ...current.hero, title: 'Depois' },
    });
    const reloaded = await getConteudosContent(db);
    expect(reloaded.overlays).toHaveLength(1);
    expect(reloaded.overlays[0].id).toBe('ov-1');
    expect(reloaded.hero.title).toBe('Depois');
  });
});
