/**
 * Criação e duplicação de serviços (item 5 do escopo: gerenciamento
 * completo de páginas/conteúdo) — cobre: slug da cópia nunca colide, cópia
 * sempre entra como rascunho (nunca publica sozinha), `display_order` da
 * cópia/novo serviço sempre vai para o fim da lista, e `editor_json` nunca
 * é copiado (a cópia começa 100% herdada).
 */
import { describe, it, expect } from 'vitest';
import { createService, duplicateService, slugExists } from '../src/lib/services';
import type { ServiceCreateInput } from '../src/lib/services';
import type { D1Database } from '../src/lib/cf-types';

interface Row {
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

function fakeDb(initialRows: Row[]) {
  const rows = [...initialRows];
  let nextId = Math.max(0, ...rows.map((r) => r.id)) + 1;
  const inserts: unknown[][] = [];

  function exec(sql: string, params: unknown[]) {
    return {
      async first() {
        if (sql.includes('MAX(display_order)')) {
          const max = rows.length ? Math.max(...rows.map((r) => r.display_order)) : -1;
          return { maxOrder: max };
        }
        if (sql.includes('SELECT id FROM services')) {
          const slug = params[0] as string;
          const row = rows.find((r) => r.slug === slug);
          return row ? { id: row.id } : null;
        }
        if (sql.includes('SELECT * FROM services WHERE slug')) {
          const slug = params[0] as string;
          return rows.find((r) => r.slug === slug) ?? null;
        }
        return null;
      },
      async run() {
        inserts.push(params);
        const [
          slug,
          name,
          shortName,
          displayOrder,
          featured,
          status,
          icon,
          summary,
          heroTitle,
          heroLead,
          contentJson,
          whatsappMessage,
          seoTitle,
          seoDescription,
        ] = params as [
          string,
          string,
          string,
          number,
          number,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
        ];
        const id = nextId;
        nextId += 1;
        rows.push({
          id,
          slug,
          name,
          short_name: shortName,
          display_order: displayOrder,
          featured,
          status,
          icon,
          summary,
          hero_title: heroTitle,
          hero_lead: heroLead,
          content_json: contentJson,
          whatsapp_message: whatsappMessage,
          seo_title: seoTitle,
          seo_description: seoDescription,
          updated_at: '2026-01-01',
          editor_json: null,
        });
        return { meta: { last_row_id: id } };
      },
    };
  }

  const db = {
    prepare(sql: string) {
      return {
        ...exec(sql, []),
        bind(...params: unknown[]) {
          return exec(sql, params);
        },
      };
    },
  } as unknown as D1Database;

  return { db, rows, inserts };
}

const baseInput: ServiceCreateInput = {
  slug: 'novo-servico',
  name: 'Novo Serviço',
  shortName: 'Novo',
  icon: 'stethoscope',
  summary: 'Resumo',
  heroTitle: 'Título',
  heroLead: 'Lead',
  image: '',
  imageAlt: '',
  intro: [],
  highlights: [],
  blocks: [],
  deliverables: [],
  audience: [],
  whatsappMessage: '',
  seoTitle: 'Novo Serviço',
  seoDescription: 'Resumo',
  status: 'draft',
  featured: false,
};

describe('createService', () => {
  it('entra sempre como rascunho, no fim da lista (maior display_order + 1)', async () => {
    const { db, rows } = fakeDb([
      {
        id: 1,
        slug: 'existente',
        name: 'Existente',
        short_name: 'Existente',
        display_order: 3,
        featured: 0,
        status: 'published',
        icon: 'stethoscope',
        summary: '',
        hero_title: '',
        hero_lead: '',
        content_json: '{}',
        whatsapp_message: '',
        seo_title: '',
        seo_description: '',
        updated_at: '2026-01-01',
        editor_json: null,
      },
    ]);

    await createService(db, baseInput);
    const created = rows.find((r) => r.slug === 'novo-servico')!;
    expect(created.display_order).toBe(4);
    expect(created.status).toBe('draft');
  });

  it('lista vazia: o primeiro serviço entra com display_order 0', async () => {
    const { db, rows } = fakeDb([]);
    await createService(db, baseInput);
    expect(rows[0]!.display_order).toBe(0);
  });
});

describe('duplicateService', () => {
  const original: Row = {
    id: 1,
    slug: 'auditoria-concorrente',
    name: 'Auditoria Concorrente',
    short_name: 'Auditoria',
    display_order: 0,
    featured: 1,
    status: 'published',
    icon: 'stethoscope',
    summary: 'Resumo original',
    hero_title: 'Título original',
    hero_lead: 'Lead original',
    content_json: JSON.stringify({
      image: '/images/a.svg',
      imageAlt: 'alt',
      intro: ['p1'],
      highlights: [],
      blocks: [],
      deliverables: [],
      audience: [],
    }),
    whatsapp_message: 'mensagem',
    seo_title: 'SEO título',
    seo_description: 'SEO descrição',
    updated_at: '2026-01-01',
    editor_json: JSON.stringify({ v: 1, pageStyle: { brandColor: '#ff0000' } }),
  };

  it('retorna null quando o serviço original não existe', async () => {
    const { db } = fakeDb([]);
    expect(await duplicateService(db, 'nao-existe')).toBeNull();
  });

  it('cria uma cópia com slug "-copia", sempre como rascunho e nunca em destaque', async () => {
    const { db, rows } = fakeDb([original]);
    const newSlug = await duplicateService(db, 'auditoria-concorrente');
    expect(newSlug).toBe('auditoria-concorrente-copia');

    const copy = rows.find((r) => r.slug === newSlug)!;
    expect(copy.status).toBe('draft');
    expect(copy.featured).toBe(0);
    expect(copy.name).toBe('Auditoria Concorrente (cópia)');
    // editor_json nunca é copiado — a cópia começa 100% herdada.
    expect(copy.editor_json).toBeNull();
  });

  it('slug da cópia nunca colide: incrementa até achar um livre', async () => {
    const { db, rows } = fakeDb([
      original,
      { ...original, id: 2, slug: 'auditoria-concorrente-copia' },
    ]);
    const newSlug = await duplicateService(db, 'auditoria-concorrente');
    expect(newSlug).toBe('auditoria-concorrente-copia-2');
    expect(rows.some((r) => r.slug === 'auditoria-concorrente-copia-2')).toBe(true);
  });

  it('slugExists reconhece o slug recém-criado', async () => {
    const { db } = fakeDb([original]);
    await duplicateService(db, 'auditoria-concorrente');
    expect(await slugExists(db, 'auditoria-concorrente-copia')).toBe(true);
    expect(await slugExists(db, 'slug-livre')).toBe(false);
  });
});
