-- Item "Portfólio" no menu principal, logo depois de "Quem Somos" (ordem 20).
INSERT INTO navigation_items (label, item_type, url, display_order)
SELECT 'Portfólio', 'external', '/portfolio', 25
WHERE NOT EXISTS (
  SELECT 1 FROM navigation_items WHERE url = '/portfolio' AND deleted_at IS NULL
);
