import type { D1Database } from './cf-types';
import { safeHref } from './urls';

export interface NavigationItem {
  id: number;
  label: string;
  type: 'internal' | 'external';
  pageId: number | null;
  href: string;
  parentId: number | null;
  order: number;
  newTab: boolean;
  children: NavigationItem[];
}

export interface NavigationRow {
  id: number;
  label: string;
  item_type: 'internal' | 'external';
  page_id: number | null;
  page_slug: string | null;
  page_status: string | null;
  page_archived_at: string | null;
  url: string;
  parent_id: number | null;
  display_order: number;
  new_tab: number;
}

const SELECT_NAV = `
  SELECT n.id, n.label, n.item_type, n.page_id, p.slug AS page_slug,
    p.status AS page_status, p.archived_at AS page_archived_at, n.url,
    n.parent_id, n.display_order, n.new_tab
  FROM navigation_items n LEFT JOIN pages p ON p.id = n.page_id
  WHERE n.deleted_at IS NULL
`;

function rowToItem(row: NavigationRow): NavigationItem | null {
  const href = row.item_type === 'internal' ? (row.page_slug ?? '') : safeHref(row.url);
  if (!href) return null;
  if (
    row.item_type === 'internal' &&
    (row.page_status !== 'published' || row.page_archived_at !== null)
  )
    return null;
  return {
    id: row.id,
    label: row.label,
    type: row.item_type,
    pageId: row.page_id,
    href,
    parentId: row.parent_id,
    order: row.display_order,
    newTab: row.new_tab === 1,
    children: [],
  };
}

export function buildNavigationTree(rows: NavigationRow[]): NavigationItem[] {
  const items = rows.map(rowToItem).filter((item): item is NavigationItem => Boolean(item));
  const byId = new Map(items.map((item) => [item.id, item]));
  const roots: NavigationItem[] = [];
  const createsCycle = (item: NavigationItem): boolean => {
    const seen = new Set([item.id]);
    let parentId = item.parentId;
    while (parentId !== null) {
      if (seen.has(parentId)) return true;
      seen.add(parentId);
      parentId = byId.get(parentId)?.parentId ?? null;
    }
    return false;
  };
  for (const item of items) {
    const parent = item.parentId === null ? null : byId.get(item.parentId);
    if (!parent || createsCycle(item)) roots.push(item);
    else parent.children.push(item);
  }
  const sort = (list: NavigationItem[]) => {
    list.sort((a, b) => a.order - b.order || a.id - b.id);
    list.forEach((item) => sort(item.children));
  };
  sort(roots);
  return roots;
}

export async function listNavigation(db: D1Database): Promise<NavigationItem[]> {
  const { results } = await db
    .prepare(`${SELECT_NAV} ORDER BY n.display_order, n.id`)
    .all<NavigationRow>();
  return buildNavigationTree(results ?? []);
}

export interface NavigationAdminItem extends Omit<NavigationItem, 'children'> {
  pageTitle: string;
  active: boolean;
}

export async function listNavigationAdmin(db: D1Database): Promise<NavigationAdminItem[]> {
  const { results } = await db
    .prepare(
      `SELECT n.id, n.label, n.item_type, n.page_id, p.slug AS page_slug,
        p.status AS page_status, p.archived_at AS page_archived_at, n.url,
        n.parent_id, n.display_order, n.new_tab, p.title AS page_title
       FROM navigation_items n LEFT JOIN pages p ON p.id = n.page_id
       WHERE n.deleted_at IS NULL
       ORDER BY n.parent_id IS NOT NULL, n.display_order, n.id`
    )
    .all<NavigationRow & { page_title: string | null }>();
  return (results ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    type: row.item_type,
    pageId: row.page_id,
    pageTitle: row.page_title ?? '',
    href: row.item_type === 'internal' ? (row.page_slug ?? '') : row.url,
    parentId: row.parent_id,
    order: row.display_order,
    newTab: row.new_tab === 1,
    active:
      row.item_type === 'external' ||
      (row.page_status === 'published' && row.page_archived_at === null),
  }));
}

export async function navigationParentWouldCycle(
  db: D1Database,
  id: number,
  parentId: number | null
): Promise<boolean> {
  if (parentId === null) return false;
  if (id === parentId) return true;
  const { results } = await db
    .prepare('SELECT id, parent_id FROM navigation_items WHERE deleted_at IS NULL')
    .all<{ id: number; parent_id: number | null }>();
  const parents = new Map((results ?? []).map((row) => [row.id, row.parent_id]));
  const seen = new Set([id]);
  let cursor: number | null = parentId;
  while (cursor !== null) {
    if (seen.has(cursor)) return true;
    seen.add(cursor);
    cursor = parents.get(cursor) ?? null;
  }
  return false;
}

export async function upsertNavigationItem(
  db: D1Database,
  input: {
    id?: number;
    label: string;
    type: 'internal' | 'external';
    pageId: number | null;
    url: string;
    parentId: number | null;
    order: number;
    newTab: boolean;
  }
): Promise<number> {
  const label = input.label.trim().slice(0, 100);
  if (!label) throw new Error('Informe o nome do item.');
  const url = input.type === 'external' ? safeHref(input.url) : '';
  if (input.type === 'external' && !url.startsWith('https://')) {
    throw new Error('Use uma URL externa HTTPS.');
  }
  if (input.type === 'internal' && !input.pageId) throw new Error('Escolha uma pagina.');
  const id = input.id ?? 0;
  if (id && (await navigationParentWouldCycle(db, id, input.parentId))) {
    throw new Error('O item pai criaria um ciclo.');
  }
  const values = [
    label,
    input.type,
    input.type === 'internal' ? input.pageId : null,
    url,
    input.parentId,
    Math.max(0, Math.round(input.order)),
    input.newTab ? 1 : 0,
  ];
  if (id) {
    await db
      .prepare(
        `UPDATE navigation_items SET label=?1, item_type=?2, page_id=?3, url=?4,
          parent_id=?5, display_order=?6, new_tab=?7, updated_at=datetime('now')
         WHERE id=?8 AND deleted_at IS NULL`
      )
      .bind(...values, id)
      .run();
    return id;
  }
  const result = await db
    .prepare(
      `INSERT INTO navigation_items
        (label,item_type,page_id,url,parent_id,display_order,new_tab)
       VALUES (?1,?2,?3,?4,?5,?6,?7)`
    )
    .bind(...values)
    .run();
  return Number(result.meta.last_row_id ?? 0);
}

export async function removeNavigationItem(db: D1Database, id: number): Promise<void> {
  await db.batch([
    db
      .prepare(
        "UPDATE navigation_items SET deleted_at=datetime('now'), updated_at=datetime('now') WHERE id=?1"
      )
      .bind(id),
    db
      .prepare(
        "UPDATE navigation_items SET parent_id=NULL, updated_at=datetime('now') WHERE parent_id=?1 AND deleted_at IS NULL"
      )
      .bind(id),
  ]);
}

export async function reorderNavigation(db: D1Database, ids: number[]): Promise<void> {
  const unique = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))].slice(0, 100);
  await db.batch(
    unique.map((id, index) =>
      db
        .prepare(
          "UPDATE navigation_items SET display_order=?1, updated_at=datetime('now') WHERE id=?2 AND deleted_at IS NULL"
        )
        .bind((index + 1) * 10, id)
    )
  );
}

export interface NavigationPageOption {
  id: number;
  title: string;
  slug: string;
  archived: boolean;
}

export async function listNavigationPageOptions(
  db: D1Database
): Promise<NavigationPageOption[]> {
  const { results } = await db
    .prepare(
      `SELECT id, title, slug, archived_at FROM pages
       ORDER BY page_type, title`
    )
    .all<{ id: number; title: string; slug: string; archived_at: string | null }>();
  return (results ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    archived: row.archived_at !== null,
  }));
}
