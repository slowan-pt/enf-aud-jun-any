-- Organogramas/fluxogramas (item 8 do escopo): área livre de canvas, separada
-- das páginas semânticas do site — nunca usada para renderizar Home, Quem
-- Somos, Serviços, Conteúdos etc. Cada linha é um diagrama independente,
-- editado com Fabric.js só nesta tela administrativa.
CREATE TABLE diagrams (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  -- Estado do canvas Fabric.js (fabric.Canvas#toJSON()), como string JSON.
  canvas_json  TEXT NOT NULL DEFAULT '{}',
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at   TEXT
);
CREATE INDEX idx_diagrams_updated ON diagrams(updated_at);
