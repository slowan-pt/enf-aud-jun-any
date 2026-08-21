/**
 * Matérias do blog — CRUD real no D1 (tabela `posts`).
 *
 * O corpo é gravado como blocos tipados (paragraph/h2/h3/list/quote/divider/
 * image/video), editados no CMS por um formulário estruturado — não um
 * editor WYSIWYG de HTML livre.
 */
import type { D1Database } from './cf-types';

export type BlockNode =
  | { type: 'paragraph'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'list'; ordered?: boolean; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'divider' }
  | { type: 'image'; url: string; alt: string }
  | { type: 'video'; url: string };

export interface Post {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  categoryId: number | null;
  categoryName: string;
  categorySlug: string;
  authorId: number | null;
  authorName: string;
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  cover: string;
  coverAlt: string;
  readingMinutes: number;
  body: BlockNode[];
  seo: { title: string; description: string };
  publishedAt: string;
  updatedAt: string;
}

interface PostRow {
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

function rowToPost(row: PostRow): Post {
  let body: BlockNode[];
  try {
    body = JSON.parse(row.body_json) as BlockNode[];
  } catch {
    body = [];
  }
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    categoryId: row.category_id,
    categoryName: row.category_name ?? '',
    categorySlug: row.category_slug ?? '',
    authorId: row.author_id,
    authorName: row.author_name ?? '',
    status: row.status === 'published' || row.status === 'archived' ? row.status : 'draft',
    featured: Boolean(row.featured),
    cover: row.cover_url,
    coverAlt: row.cover_alt,
    readingMinutes: row.reading_minutes,
    body,
    seo: { title: row.seo_title, description: row.seo_description },
    publishedAt: row.published_at ?? '',
    updatedAt: row.updated_at,
  };
}

const SELECT = `
  SELECT p.id, p.slug, p.title, p.excerpt, p.category_id, c.name AS category_name,
         c.slug AS category_slug, p.author_id, a.name AS author_name, p.status,
         p.featured, p.cover_url, p.cover_alt, p.reading_minutes, p.body_json,
         p.seo_title, p.seo_description, p.published_at, p.updated_at
  FROM posts p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN authors a ON a.id = p.author_id
  WHERE p.deleted_at IS NULL
`;

export async function listPosts(db: D1Database): Promise<Post[]> {
  const { results } = await db.prepare(`${SELECT} ORDER BY p.created_at DESC`).all<PostRow>();
  return (results ?? []).map(rowToPost);
}

export async function getPost(db: D1Database, slug: string): Promise<Post | null> {
  const row = await db.prepare(`${SELECT} AND p.slug = ?1`).bind(slug).first<PostRow>();
  return row ? rowToPost(row) : null;
}

export function publishedOnly(posts: Post[]): Post[] {
  return posts
    .filter((p) => p.status === 'published')
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export interface PostInput {
  slug: string;
  title: string;
  excerpt: string;
  categoryId: number | null;
  authorId: number | null;
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  coverUrl: string;
  coverAlt: string;
  readingMinutes: number;
  body: BlockNode[];
  seoTitle: string;
  seoDescription: string;
  publishedAt: string;
}

export async function createPost(
  db: D1Database,
  input: PostInput,
  userId?: number
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO posts (
        slug, title, excerpt, category_id, author_id, status, featured, cover_url,
        cover_alt, reading_minutes, body_json, seo_title, seo_description,
        published_at, created_by, updated_by
      ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?15)`
    )
    .bind(
      input.slug,
      input.title,
      input.excerpt,
      input.categoryId,
      input.authorId,
      input.status,
      input.featured ? 1 : 0,
      input.coverUrl,
      input.coverAlt,
      input.readingMinutes,
      JSON.stringify(input.body),
      input.seoTitle,
      input.seoDescription,
      input.publishedAt || null,
      userId ?? null
    )
    .run();
}

export async function updatePost(
  db: D1Database,
  slug: string,
  input: PostInput,
  userId?: number
): Promise<void> {
  await db
    .prepare(
      `UPDATE posts SET
        title = ?1, excerpt = ?2, category_id = ?3, author_id = ?4, status = ?5,
        featured = ?6, cover_url = ?7, cover_alt = ?8, reading_minutes = ?9,
        body_json = ?10, seo_title = ?11, seo_description = ?12, published_at = ?13,
        updated_by = ?14, updated_at = datetime('now')
      WHERE slug = ?15`
    )
    .bind(
      input.title,
      input.excerpt,
      input.categoryId,
      input.authorId,
      input.status,
      input.featured ? 1 : 0,
      input.coverUrl,
      input.coverAlt,
      input.readingMinutes,
      JSON.stringify(input.body),
      input.seoTitle,
      input.seoDescription,
      input.publishedAt || null,
      userId ?? null,
      slug
    )
    .run();
}

export async function slugExists(db: D1Database, slug: string): Promise<boolean> {
  const row = await db
    .prepare(`SELECT id FROM posts WHERE slug = ?1 AND deleted_at IS NULL`)
    .bind(slug)
    .first<{ id: number }>();
  return Boolean(row);
}

export async function archivePost(db: D1Database, slug: string): Promise<void> {
  await db
    .prepare(
      `UPDATE posts SET status = 'archived', updated_at = datetime('now') WHERE slug = ?1`
    )
    .bind(slug)
    .run();
}

export function formatDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const months = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];
  return `${d} de ${months[(m ?? 1) - 1]} de ${y}`;
}

export function formatDateShort(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
