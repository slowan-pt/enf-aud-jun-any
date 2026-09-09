-- Materializa as paginas fixas que historicamente podiam existir apenas como
-- fallback no codigo. Um JSON vazio continua herdando os valores padrao.
INSERT OR IGNORE INTO pages (slug, title, status, sections_json, page_type)
VALUES ('/', 'Home', 'published', '{}', 'fixed');

INSERT OR IGNORE INTO pages (slug, title, status, sections_json, page_type)
VALUES ('/quem-somos', 'Quem Somos', 'published', '{}', 'fixed');

INSERT OR IGNORE INTO pages (slug, title, status, sections_json, page_type)
VALUES ('/servicos', 'Servicos', 'published', '{}', 'fixed');

INSERT OR IGNORE INTO pages (slug, title, status, sections_json, page_type)
VALUES ('/conteudos', 'Conteudos', 'published', '{}', 'fixed');

INSERT OR IGNORE INTO pages (slug, title, status, sections_json, page_type)
VALUES ('/contato', 'Contato', 'published', '{}', 'fixed');

-- Complete somente os itens ausentes, preservando ordem e rotulo ja editados.
INSERT INTO navigation_items (label, item_type, page_id, display_order)
SELECT 'Inicio', 'internal', p.id, 10 FROM pages p
WHERE p.slug = '/'
  AND NOT EXISTS (SELECT 1 FROM navigation_items n WHERE n.page_id = p.id);

INSERT INTO navigation_items (label, item_type, page_id, display_order)
SELECT 'Quem Somos', 'internal', p.id, 20 FROM pages p
WHERE p.slug = '/quem-somos'
  AND NOT EXISTS (SELECT 1 FROM navigation_items n WHERE n.page_id = p.id);

INSERT INTO navigation_items (label, item_type, page_id, display_order)
SELECT 'Servicos', 'internal', p.id, 30 FROM pages p
WHERE p.slug = '/servicos'
  AND NOT EXISTS (SELECT 1 FROM navigation_items n WHERE n.page_id = p.id);

INSERT INTO navigation_items (label, item_type, page_id, display_order)
SELECT 'Conteudos', 'internal', p.id, 40 FROM pages p
WHERE p.slug = '/conteudos'
  AND NOT EXISTS (SELECT 1 FROM navigation_items n WHERE n.page_id = p.id);

INSERT INTO navigation_items (label, item_type, page_id, display_order)
SELECT 'Contato', 'internal', p.id, 50 FROM pages p
WHERE p.slug = '/contato'
  AND NOT EXISTS (SELECT 1 FROM navigation_items n WHERE n.page_id = p.id);
