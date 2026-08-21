/**
 * Categorias das matérias — CRUD real no D1 (tabela `categories`).
 */
import type { D1Database } from './cf-types';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  postCount: number;
  createdAt: string;
  updatedAt: string;
}

interface CategoryRow {
  id: number;
  name: string;
  slug: string;
  description: string;
  post_count: number;
  created_at: string;
  updated_at: string;
}

function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    postCount: row.post_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_WITH_COUNT = `
  SELECT c.id, c.name, c.slug, c.description, c.created_at, c.updated_at,
         (SELECT COUNT(*) FROM posts p WHERE p.category_id = c.id AND p.deleted_at IS NULL) AS post_count
  FROM categories c
`;

export async function listCategories(db: D1Database): Promise<Category[]> {
  const { results } = await db
    .prepare(`${SELECT_WITH_COUNT} ORDER BY c.name ASC`)
    .all<CategoryRow>();
  return (results ?? []).map(rowToCategory);
}

export async function getCategory(db: D1Database, id: number): Promise<Category | null> {
  const row = await db
    .prepare(`${SELECT_WITH_COUNT} WHERE c.id = ?1`)
    .bind(id)
    .first<CategoryRow>();
  return row ? rowToCategory(row) : null;
}

export interface CategoryInput {
  name: string;
  slug: string;
  description: string;
}

export async function createCategory(db: D1Database, input: CategoryInput): Promise<void> {
  await db
    .prepare(`INSERT INTO categories (name, slug, description) VALUES (?1, ?2, ?3)`)
    .bind(input.name, input.slug, input.description)
    .run();
}

export async function updateCategory(
  db: D1Database,
  id: number,
  input: CategoryInput
): Promise<void> {
  await db
    .prepare(
      `UPDATE categories SET name = ?1, slug = ?2, description = ?3, updated_at = datetime('now')
       WHERE id = ?4`
    )
    .bind(input.name, input.slug, input.description, id)
    .run();
}

/** Retorna false sem apagar se houver matérias vinculadas. */
export async function deleteCategory(db: D1Database, id: number): Promise<boolean> {
  const category = await getCategory(db, id);
  if (!category) return true;
  if (category.postCount > 0) return false;
  await db.prepare(`DELETE FROM categories WHERE id = ?1`).bind(id).run();
  return true;
}
