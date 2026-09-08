/**
 * Política de Privacidade (/politica-de-privacidade) — mesma família de
 * garantias das outras páginas migradas: normalização, fallback,
 * isolamento entre páginas, e a lista de seções numeradas (título/texto)
 * nunca confia na estrutura recebida.
 */
import { describe, it, expect } from 'vitest';
import {
  getPoliticaContent,
  updatePoliticaContent,
  getContatoContent,
  POLITICA_SECTION_KEYS,
  POLITICA_SLUG,
} from '../src/lib/documents';
import { setByPath, reorderAtPath, duplicateAtPath, removeAtPath } from '../src/lib/editable';
import type { D1Database } from '../src/lib/cf-types';

function fakeDb(rows: Record<string, string | null> = {}) {
  const saved: { slug: string; sql: string; json: string }[] = [];
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
              saved.push({ slug, sql, json });
            },
          };
        },
      };
    },
  } as unknown as D1Database;
  return { db, saved, rows };
}

describe('getPoliticaContent — fallback e normalização', () => {
  it('sem registro salvo, cai no padrão com as 13 seções jurídicas', async () => {
    const { db } = fakeDb();
    const content = await getPoliticaContent(db);
    expect(content.sections.length).toBeGreaterThan(0);
    expect(content.sectionOrder).toEqual([...POLITICA_SECTION_KEYS]);
    expect(content.hero.title.length).toBeGreaterThan(0);
  });

  it('JSON corrompido não derruba a página', async () => {
    const { db } = fakeDb({ [POLITICA_SLUG]: '{ isto não é json' });
    const content = await getPoliticaContent(db);
    expect(content.sections.length).toBeGreaterThan(0);
  });

  it('carrega seções salvas, sem inventar nem descartar título/texto', async () => {
    const salvo = JSON.stringify({
      sections: [{ title: 'Seção editada', body: 'Texto editado' }],
    });
    const { db } = fakeDb({ [POLITICA_SLUG]: salvo });
    const content = await getPoliticaContent(db);
    expect(content.sections).toEqual([{ title: 'Seção editada', body: 'Texto editado' }]);
  });

  it('seção sem title/body em string é descartada; lista vazia cai no padrão', async () => {
    const salvo = JSON.stringify({ sections: [{ title: 123, body: 'x' }, 'não é objeto'] });
    const { db } = fakeDb({ [POLITICA_SLUG]: salvo });
    const content = await getPoliticaContent(db);
    expect(content.sections.length).toBeGreaterThan(0); // caiu no padrão
  });

  it('recusa chave de seção que não pertence a esta página', async () => {
    const salvo = JSON.stringify({ sectionOrder: ['list', 'nota', 'conteudo'] });
    const { db } = fakeDb({ [POLITICA_SLUG]: salvo });
    const content = await getPoliticaContent(db);
    expect(content.sectionOrder).not.toContain('list');
    expect(content.sectionOrder).toEqual(expect.arrayContaining([...POLITICA_SECTION_KEYS]));
  });
});

describe('isolamento entre Política de Privacidade e Contato', () => {
  it('salvar Política não afeta a linha de Contato', async () => {
    const { db, rows } = fakeDb({
      [POLITICA_SLUG]: JSON.stringify({ hero: { title: 'Antes' } }),
      '/contato': JSON.stringify({ formTitle: 'Contato original' }),
    });
    const current = await getPoliticaContent(db);
    await updatePoliticaContent(db, { ...current, hero: { ...current.hero, title: 'Depois' } });

    expect(JSON.parse(rows[POLITICA_SLUG]!).hero.title).toBe('Depois');
    expect(JSON.parse(rows['/contato']!).formTitle).toBe('Contato original');

    const contato = await getContatoContent(db);
    expect(contato.formTitle).toBe('Contato original');
  });
});

describe('lista de seções jurídicas: editar, reordenar, duplicar, excluir', () => {
  function doc() {
    return {
      sections: [
        { title: 'Seção A', body: 'texto A' },
        { title: 'Seção B', body: 'texto B' },
        { title: 'Seção C', body: 'texto C' },
      ],
    };
  }

  it('edita título e corpo por caminho estável (por índice, igual a about.paragraphs)', () => {
    const d = doc();
    expect(setByPath(d, 'sections.0.title', 'Novo título')).toBe(true);
    expect(setByPath(d, 'sections.0.body', 'Novo corpo\n\ncom parágrafos')).toBe(true);
    expect(d.sections[0]).toEqual({
      title: 'Novo título',
      body: 'Novo corpo\n\ncom parágrafos',
    });
  });

  it('duplicar clona fielmente; excluir remove exatamente o item pedido', () => {
    const d = doc();
    expect(duplicateAtPath(d, 'sections', 0)).toBe(true);
    expect(d.sections).toHaveLength(4);
    expect(d.sections[1]).toEqual(d.sections[0]);

    expect(removeAtPath(d, 'sections', 1)).toBe(true);
    expect(d.sections).toHaveLength(3);
    expect(d.sections.map((s) => s.title)).toEqual(['Seção A', 'Seção B', 'Seção C']);
  });

  it('reordenar move o item, preservando título/texto de cada um', () => {
    const d = doc();
    expect(reorderAtPath(d, 'sections', 0, 2)).toBe(true);
    expect(d.sections.map((s) => s.title)).toEqual(['Seção B', 'Seção C', 'Seção A']);
  });

  it('não permite excluir a última seção restante', () => {
    const d = { sections: [{ title: 'Única', body: 'x' }] };
    expect(removeAtPath(d, 'sections', 0)).toBe(false);
  });
});
