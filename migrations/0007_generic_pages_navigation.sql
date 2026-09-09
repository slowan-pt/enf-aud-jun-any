-- Paginas institucionais genericas e menu administravel.
--
-- Migracao estritamente aditiva: as paginas fixas existentes continuam com
-- page_type = 'fixed' e seus JSONs permanecem intocados. Arquivamento usa uma
-- coluna separada para nao exigir a reconstrucao da tabela `pages` (cujo CHECK
-- de status originalmente aceita apenas draft/published).
ALTER TABLE pages ADD COLUMN page_type TEXT NOT NULL DEFAULT 'fixed'
  CHECK (page_type IN ('fixed', 'generic'));
ALTER TABLE pages ADD COLUMN parent_id INTEGER REFERENCES pages(id) ON DELETE SET NULL;
ALTER TABLE pages ADD COLUMN show_in_menu INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pages ADD COLUMN menu_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pages ADD COLUMN social_image_id INTEGER REFERENCES media(id) ON DELETE SET NULL;
ALTER TABLE pages ADD COLUMN editor_json TEXT;
ALTER TABLE pages ADD COLUMN archived_at TEXT;

CREATE INDEX idx_pages_type_status ON pages(page_type, status, archived_at);
CREATE INDEX idx_pages_parent ON pages(parent_id);

CREATE TABLE navigation_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  label         TEXT NOT NULL,
  item_type     TEXT NOT NULL CHECK (item_type IN ('internal', 'external')),
  page_id       INTEGER REFERENCES pages(id) ON DELETE SET NULL,
  url           TEXT NOT NULL DEFAULT '',
  parent_id     INTEGER REFERENCES navigation_items(id) ON DELETE SET NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  new_tab       INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at    TEXT,
  CHECK (
    (item_type = 'internal' AND page_id IS NOT NULL AND url = '') OR
    (item_type = 'external' AND page_id IS NULL AND url <> '')
  )
);
CREATE INDEX idx_navigation_parent_order
  ON navigation_items(parent_id, display_order, id);

-- Preserva a navegacao publica atual na primeira aplicacao. Os SELECTs tornam
-- os itens dependentes das paginas reais, sem supor IDs de um banco especifico.
INSERT INTO navigation_items (label, item_type, page_id, display_order)
  SELECT 'Inicio', 'internal', id, 10 FROM pages WHERE slug = '/';
INSERT INTO navigation_items (label, item_type, page_id, display_order)
  SELECT 'Quem Somos', 'internal', id, 20 FROM pages WHERE slug = '/quem-somos';
INSERT INTO navigation_items (label, item_type, page_id, display_order)
  SELECT 'Servicos', 'internal', id, 30 FROM pages WHERE slug = '/servicos';
INSERT INTO navigation_items (label, item_type, page_id, display_order)
  SELECT 'Conteudos', 'internal', id, 40 FROM pages WHERE slug = '/conteudos';
INSERT INTO navigation_items (label, item_type, page_id, display_order)
  SELECT 'Contato', 'internal', id, 50 FROM pages WHERE slug = '/contato';
