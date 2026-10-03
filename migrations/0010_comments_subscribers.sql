-- Comentarios nas materias (moderados) e lista de inscritos para receber
-- novas publicacoes. Aditiva: nao altera nenhuma tabela existente.
CREATE TABLE post_comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id     INTEGER NOT NULL,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  body        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pendente',
  reply       TEXT NOT NULL DEFAULT '',
  ip          TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_post_comments_post ON post_comments(post_id, status, created_at);
CREATE INDEX idx_post_comments_status ON post_comments(status, created_at);

CREATE TABLE newsletter_subscribers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'ativo',
  source      TEXT NOT NULL DEFAULT '',
  consent     INTEGER NOT NULL DEFAULT 1,
  ip          TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_newsletter_status ON newsletter_subscribers(status, created_at);

-- Limite de envios por IP, separado do formulario de contato.
CREATE TABLE engagement_rate_limit (
  key          TEXT PRIMARY KEY,
  attempts     INTEGER NOT NULL,
  window_start TEXT NOT NULL
);
