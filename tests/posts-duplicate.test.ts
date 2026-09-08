/**
 * Duplicação de matérias (item 5 do escopo) — mesma garantia de
 * services-create-duplicate.test.ts: slug da cópia nunca colide, a cópia
 * sempre entra como rascunho e nunca é destaque (nunca publica sozinha), e
 * `editor_json` (Aparência) nunca é copiado.
 */
import { describe, it, expect } from 'vitest';
import { duplicatePost, slugExists } from '../src/lib/posts';
import type { D1Database } from '../src/lib/cf-types';

interface Row {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  category_id: number | null;
  category_name: string | null;
  category_slug: string | null;
  author_id: number | null;
  author_name: string | null;
  status: string;
  featured: number;
  cover_url: string;
  cover_alt: string;
  reading_minutes: number;
  body_json: string;
  seo_title: string;
  seo_description: string;
  published_at: string | null;
  updated_at: string;
}

function fakeDb(initialRows: Row[]) {
  const rows = [...initialRows];
  let nextId = Math.max(0, ...rows.map((r) => r.id)) + 1;

  function exec(sql: string, params: unknown[]) {
    return {
      async first() {
        if (sql.includes('SELECT id FROM posts')) {
          const slug = params[0] as string;
          const row = rows.find((r) => r.slug === slug);
          return row ? { id: row.id } : null;
        }
        if (sql.includes('FROM posts p')) {
          const slug = params[0] as string;
          return rows.find((r) => r.slug === slug) ?? null;
        }
        return null;
      },
      async run() {
        const [
          slug,
          title,
          excerpt,
          categoryId,
          authorId,
          status,
          featured,
          coverUrl,
          coverAlt,
          readingMinutes,
          bodyJson,
          seoTitle,
          seoDescription,
          publishedAt,
        ] = params as [
          string,
          string,
          string,
          number | null,
          number | null,
          string,
          number,
          string,
          string,
          number,
          string,
          string,
          string,
          string | null,
        ];
        const id = nextId;
        nextId += 1;
        rows.push({
          id,
          slug,
          title,
          excerpt,
          category_id: categoryId,
          category_name: null,
          category_slug: null,
          author_id: authorId,
          author_name: null,
          status,
          featured,
          cover_url: coverUrl,
          cover_alt: coverAlt,
          reading_minutes: readingMinutes,
          body_json: bodyJson,
          seo_title: seoTitle,
          seo_description: seoDescription,
          published_at: publishedAt,
          updated_at: '2026-01-01',
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

  return { db, rows };
}

const original: Row = {
  id: 1,
  slug: 'auditoria-concorrente-post',
  title: 'Auditoria concorrente: visão geral',
  excerpt: 'Resumo original',
  category_id: null,
  category_name: null,
  category_slug: null,
  author_id: null,
  author_name: null,
  status: 'published',
  featured: 1,
  cover_url: '/images/a.svg',
  cover_alt: 'alt',
  reading_minutes: 6,
  body_json: JSON.stringify([{ type: 'paragraph', text: 'Texto' }]),
  seo_title: 'SEO título',
  seo_description: 'SEO descrição',
  published_at: '2026-08-01',
  updated_at: '2026-01-01',
};

describe('duplicatePost', () => {
  it('retorna null quando a matéria original não existe', async () => {
    const { db } = fakeDb([]);
    expect(await duplicatePost(db, 'nao-existe')).toBeNull();
  });

  it('cria uma cópia com slug "-copia", sempre como rascunho e nunca em destaque', async () => {
    const { db, rows } = fakeDb([original]);
    const newSlug = await duplicatePost(db, 'auditoria-concorrente-post');
    expect(newSlug).toBe('auditoria-concorrente-post-copia');

    const copy = rows.find((r) => r.slug === newSlug)!;
    expect(copy.status).toBe('draft');
    expect(copy.featured).toBe(0);
    expect(copy.title).toBe('Auditoria concorrente: visão geral (cópia)');
    expect(copy.published_at).toBeFalsy();
  });

  it('slug da cópia nunca colide: incrementa até achar um livre', async () => {
    const { db, rows } = fakeDb([
      original,
      { ...original, id: 2, slug: 'auditoria-concorrente-post-copia' },
    ]);
    const newSlug = await duplicatePost(db, 'auditoria-concorrente-post');
    expect(newSlug).toBe('auditoria-concorrente-post-copia-2');
    expect(rows.some((r) => r.slug === 'auditoria-concorrente-post-copia-2')).toBe(true);
  });

  it('slugExists reconhece o slug recém-criado', async () => {
    const { db } = fakeDb([original]);
    await duplicatePost(db, 'auditoria-concorrente-post');
    expect(await slugExists(db, 'auditoria-concorrente-post-copia')).toBe(true);
    expect(await slugExists(db, 'slug-livre')).toBe(false);
  });
});
