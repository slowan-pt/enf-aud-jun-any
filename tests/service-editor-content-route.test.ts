/**
 * Teste de integração da rota real (`POST` de
 * src/pages/admin/api/service-editor-content.ts) — inspeciona exatamente
 * quais colunas cada tipo de operação grava, em vez de testar só as funções
 * de mais baixo nível isoladamente. É a resposta direta à correção pedida:
 * o contrato é "operação de conteúdo → content_json; operação de
 * aparência/layout → editor_json", nunca o contrário, e nenhuma escrita
 * pode substituir a coluna inteira da outra.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { D1Database } from '../src/lib/cf-types';

vi.mock('../src/lib/db', () => ({
  getDB: () => fakeDb,
  writeAuditLog: vi.fn(async () => {}),
}));

interface FakeRow {
  id: number;
  slug: string;
  name: string;
  short_name: string;
  display_order: number;
  featured: number;
  status: string;
  icon: string;
  summary: string;
  hero_title: string;
  hero_lead: string;
  content_json: string;
  whatsapp_message: string;
  seo_title: string;
  seo_description: string;
  updated_at: string;
  editor_json: string | null;
}

let row: FakeRow;
let writes: { sql: string; params: unknown[] }[];
let fakeDb: D1Database;

function baseRow(): FakeRow {
  return {
    id: 1,
    slug: 'auditoria-concorrente',
    name: 'Auditoria Concorrente',
    short_name: 'Auditoria',
    display_order: 1,
    featured: 1,
    status: 'published',
    icon: 'stethoscope',
    summary: 'Resumo',
    hero_title: 'Hero título',
    hero_lead: 'Hero lead',
    content_json: JSON.stringify({
      image: '/images/a.svg',
      imageAlt: 'alt',
      intro: ['p1'],
      highlights: [
        { id: 'h1', icon: 'search', title: 'Destaque A', text: 'texto A' },
        { id: 'h2', icon: 'shield', title: 'Destaque B', text: 'texto B' },
      ],
      blocks: [{ id: 'b1', title: 'Bloco', text: 'texto do bloco' }],
      deliverables: ['d1'],
      audience: ['a1'],
    }),
    whatsapp_message: 'msg',
    seo_title: 'seo t',
    seo_description: 'seo d',
    updated_at: '2026-01-01',
    editor_json: null,
  };
}

function makeFakeDb(): D1Database {
  return {
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          return {
            async first() {
              if (sql.includes('SELECT * FROM services')) return { ...row };
              if (sql.includes('SELECT editor_json FROM services')) {
                return { editor_json: row.editor_json };
              }
              return null;
            },
            async run() {
              writes.push({ sql, params });
              if (sql.includes('SET content_json') && sql.includes('editor_json')) {
                // migração atômica (content_json + editor_json na mesma instrução)
                row.content_json = String(params[0]);
                row.editor_json = String(params[1]);
                return;
              }
              if (sql.includes('content_json')) {
                row.content_json = String(params[10]); // ver bind order em updateServiceById
                return;
              }
              if (sql.includes('editor_json')) {
                row.editor_json = String(params[0]);
              }
            },
            async all() {
              return { results: [] };
            },
          };
        },
      };
    },
  } as unknown as D1Database;
}

async function postOps(ops: unknown[]) {
  const { POST } = await import('../src/pages/admin/api/service-editor-content');
  const request = new Request('http://localhost/admin/api/service-editor-content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceId: 1, ops }),
  });
  return POST({
    request,
    locals: { user: { id: 1, name: 'Admin' } },
  } as never);
}

beforeEach(() => {
  row = baseRow();
  writes = [];
  fakeDb = makeFakeDb();
});

describe('contrato de gravação: conteúdo → content_json, aparência → editor_json', () => {
  it('operação "set" (texto) grava content_json, nunca editor_json', async () => {
    const res = await postOps([{ op: 'set', path: 'heroTitle', value: 'Novo título' }]);
    expect(res.status).toBe(200);

    const contentWrites = writes.filter((w) => w.sql.includes('content_json'));
    const editorOnlyWrites = writes.filter(
      (w) => w.sql.includes('editor_json') && !w.sql.includes('content_json')
    );
    expect(contentWrites.length).toBeGreaterThan(0);
    expect(editorOnlyWrites).toHaveLength(0);
    expect(JSON.parse(row.content_json).image).toBe('/images/a.svg'); // resto do conteúdo intacto
  });

  it('operação "layout" (posição) grava editor_json, nunca content_json', async () => {
    const res = await postOps([
      {
        op: 'layout',
        path: 'heroTitle',
        device: 'desktop',
        layout: {
          v: 2,
          x: 10,
          y: 5,
          w: 0,
          h: 0,
          z: 0,
          fontSize: 0,
          color: '',
          align: '',
          weight: 0,
          r: 0,
          locked: false,
          hidden: false,
          label: '',
        },
      },
    ]);
    expect(res.status).toBe(200);

    const editorWrites = writes.filter(
      (w) => w.sql.includes('editor_json') && !w.sql.includes('content_json')
    );
    const contentOnlyWrites = writes.filter(
      (w) => w.sql.includes('content_json') && !w.sql.includes('editor_json')
    );
    expect(editorWrites.length).toBeGreaterThan(0);
    expect(contentOnlyWrites).toHaveLength(0);
    expect(row.content_json).toBe(baseRow().content_json); // content_json byte a byte intacto
  });

  it('"page-style" (aparência) grava só editor_json', async () => {
    await postOps([{ op: 'page-style', value: { brandColor: '#ff0000' } }]);
    expect(JSON.parse(row.editor_json!).pageStyle.brandColor).toBe('#ff0000');
    expect(row.content_json).toBe(baseRow().content_json);
  });

  it('editar um destaque (highlights.0.title) grava content_json, preserva editor_json existente', async () => {
    row.editor_json = JSON.stringify({
      v: 1,
      pageStyle: { brandColor: '', accentColor: '', backgroundColor: '', headingColor: '' },
      sectionStyles: {
        highlights: { bg: '', text: '', image: '', overlay: '', minHeight: '', paddingY: '' },
        content: { bg: '', text: '', image: '', overlay: '', minHeight: '', paddingY: '' },
        form: { bg: '', text: '', image: '', overlay: '', minHeight: '', paddingY: '' },
        others: { bg: '', text: '', image: '', overlay: '', minHeight: '', paddingY: '' },
      },
      sectionOrder: ['highlights', 'content', 'form', 'others'],
      hiddenSections: [],
      layouts: {
        'highlights.h1.title': {
          desktop: {
            v: 2,
            x: 7,
            y: 0,
            w: 0,
            h: 0,
            z: 0,
            fontSize: 0,
            color: '',
            align: '',
            weight: 0,
            r: 0,
            locked: false,
            hidden: false,
            label: '',
          },
          mobile: null,
        },
      },
      overlays: [],
    });
    const editorJsonAntes = row.editor_json;

    await postOps([{ op: 'set', path: 'highlights.0.title', value: 'Título editado' }]);

    expect(JSON.parse(row.content_json).highlights[0].title).toBe('Título editado');
    expect(row.editor_json).toBe(editorJsonAntes); // não tocou no editor_json
  });
});

describe('duplicar/excluir destaques via a rota real', () => {
  it('duplicar highlights.0 cria item com id NOVO (nunca igual ao original)', async () => {
    await postOps([{ op: 'duplicate', path: 'highlights', index: 0 }]);
    const highlights = JSON.parse(row.content_json).highlights;
    expect(highlights).toHaveLength(3);
    expect(highlights[1].id).not.toBe('h1');
    expect(highlights[1].id).toBeTruthy();
    expect(highlights[1].title).toBe('Destaque A'); // conteúdo clonado fielmente
  });

  it('excluir highlights.0 remove o item e purga o layout órfão em editor_json', async () => {
    row.editor_json = JSON.stringify({
      v: 1,
      pageStyle: { brandColor: '', accentColor: '', backgroundColor: '', headingColor: '' },
      sectionStyles: {
        highlights: { bg: '', text: '', image: '', overlay: '', minHeight: '', paddingY: '' },
        content: { bg: '', text: '', image: '', overlay: '', minHeight: '', paddingY: '' },
        form: { bg: '', text: '', image: '', overlay: '', minHeight: '', paddingY: '' },
        others: { bg: '', text: '', image: '', overlay: '', minHeight: '', paddingY: '' },
      },
      sectionOrder: ['highlights', 'content', 'form', 'others'],
      hiddenSections: [],
      layouts: {
        'highlights.h1.title': {
          desktop: {
            v: 2,
            x: 7,
            y: 0,
            w: 0,
            h: 0,
            z: 0,
            fontSize: 0,
            color: '',
            align: '',
            weight: 0,
            r: 0,
            locked: false,
            hidden: false,
            label: '',
          },
          mobile: null,
        },
        'highlights.h2.title': {
          desktop: {
            v: 2,
            x: 99,
            y: 0,
            w: 0,
            h: 0,
            z: 0,
            fontSize: 0,
            color: '',
            align: '',
            weight: 0,
            r: 0,
            locked: false,
            hidden: false,
            label: '',
          },
          mobile: null,
        },
      },
      overlays: [],
    });

    await postOps([{ op: 'remove', path: 'highlights', index: 0 }]);

    const editorAgora = JSON.parse(row.editor_json!);
    expect(editorAgora.layouts['highlights.h1.title']).toBeUndefined(); // órfão purgado
    expect(editorAgora.layouts['highlights.h2.title'].desktop.x).toBe(99); // o outro item intacto

    const highlights = JSON.parse(row.content_json).highlights;
    expect(highlights).toHaveLength(1);
    expect(highlights[0].id).toBe('h2');
  });
});
