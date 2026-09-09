import { describe, expect, it } from 'vitest';
import { buildNavigationTree, type NavigationRow } from '../src/lib/navigation';

function row(overrides: Partial<NavigationRow> & Pick<NavigationRow, 'id'>): NavigationRow {
  return {
    id: overrides.id,
    label: overrides.label ?? `Item ${overrides.id}`,
    item_type: overrides.item_type ?? 'external',
    page_id: overrides.page_id ?? null,
    page_slug: overrides.page_slug ?? null,
    page_status: overrides.page_status ?? null,
    page_archived_at: overrides.page_archived_at ?? null,
    url: overrides.url ?? `https://example.com/${overrides.id}`,
    parent_id: overrides.parent_id ?? null,
    display_order: overrides.display_order ?? overrides.id,
    new_tab: overrides.new_tab ?? 0,
  };
}

describe('menu publico', () => {
  it('monta hierarquia e respeita a ordem', () => {
    const tree = buildNavigationTree([
      row({ id: 2, display_order: 20 }),
      row({ id: 3, parent_id: 1, display_order: 5 }),
      row({ id: 1, display_order: 10 }),
    ]);
    expect(tree.map((item) => item.id)).toEqual([1, 2]);
    expect(tree[0]?.children.map((item) => item.id)).toEqual([3]);
  });

  it('recusa URL insegura e esconde pagina interna nao publicada ou arquivada', () => {
    const tree = buildNavigationTree([
      row({ id: 1, url: 'javascript:alert(1)' }),
      row({ id: 2, item_type: 'internal', page_id: 2, page_slug: '/rascunho', page_status: 'draft', url: '' }),
      row({ id: 3, item_type: 'internal', page_id: 3, page_slug: '/arquivada', page_status: 'published', page_archived_at: '2026-01-01', url: '' }),
      row({ id: 4, item_type: 'internal', page_id: 4, page_slug: '/publicada', page_status: 'published', url: '' }),
    ]);
    expect(tree.map((item) => item.id)).toEqual([4]);
  });

  it('promove ciclos para a raiz sem recursao infinita', () => {
    const tree = buildNavigationTree([row({ id: 1, parent_id: 2 }), row({ id: 2, parent_id: 1 })]);
    expect(tree.map((item) => item.id).sort()).toEqual([1, 2]);
    expect(tree.every((item) => item.children.length === 0)).toBe(true);
  });
});
