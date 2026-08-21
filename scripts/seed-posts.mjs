#!/usr/bin/env node
/**
 * Gera o SQL de seed das categorias, do autor padrão e das matérias de
 * demonstração hoje em src/data/posts.ts. Conteúdo educativo de
 * demonstração (não são dados reais da Essencial Saúde) — mantido para não
 * deixar o blog vazio até o proprietário publicar matérias próprias.
 *
 * Uso:
 *   node scripts/seed-posts.mjs > /tmp/seed.sql
 *   npx wrangler d1 execute essencial-saude-db --local --file=/tmp/seed.sql
 */
import { categories, authors, posts } from '../src/data/posts.ts';

function esc(value) {
  return String(value).replace(/'/g, "''");
}

for (const c of categories) {
  console.log(`INSERT INTO categories (name, slug, description)
  VALUES ('${esc(c.name)}', '${esc(c.slug)}', '${esc(c.description)}')
  ON CONFLICT(slug) DO NOTHING;`);
}

for (const a of authors) {
  console.log(`INSERT INTO authors (name, role, bio, status)
  SELECT '${esc(a.name)}', '${esc(a.role)}', '${esc(a.bio)}', '${a.status}'
  WHERE NOT EXISTS (SELECT 1 FROM authors WHERE name = '${esc(a.name)}');`);
}

for (const p of posts) {
  const categorySlug = esc(p.categorySlug);
  const authorName = esc(authors.find((a) => a.id === p.authorId)?.name ?? '');
  console.log(`INSERT INTO posts (
    slug, title, excerpt, category_id, author_id, status, featured, cover_url,
    cover_alt, reading_minutes, body_json, seo_title, seo_description, published_at
  )
  SELECT '${esc(p.slug)}', '${esc(p.title)}', '${esc(p.excerpt)}',
    (SELECT id FROM categories WHERE slug = '${categorySlug}'),
    (SELECT id FROM authors WHERE name = '${authorName}'),
    '${p.status}', ${p.featured ? 1 : 0}, '${esc(p.cover)}', '${esc(p.coverAlt)}',
    ${p.readingMinutes}, '${esc(JSON.stringify(p.body))}', '${esc(p.seo.title)}',
    '${esc(p.seo.description)}', '${p.publishedAt}'
  WHERE NOT EXISTS (SELECT 1 FROM posts WHERE slug = '${esc(p.slug)}');`);
}
