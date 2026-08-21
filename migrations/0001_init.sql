-- ============================================================================
-- Essencial Saúde Auditoria — schema inicial (Cloudflare D1 / SQLite)
-- Migration: 0001_init
-- ============================================================================

PRAGMA foreign_keys = ON;

-- --------------------------------------------------------------- usuários
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'editor')),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  last_login_at TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- sessões de login (cookie HttpOnly guarda apenas o id da sessão)
CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- tentativas de login, para rate limiting / proteção contra força bruta
CREATE TABLE login_attempts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL,
  ip         TEXT NOT NULL,
  success    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_login_attempts_email_time ON login_attempts(email, created_at);
CREATE INDEX idx_login_attempts_ip_time ON login_attempts(ip, created_at);

-- ------------------------------------------------------------------- mídia
CREATE TABLE media (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  r2_key      TEXT NOT NULL UNIQUE,
  url         TEXT NOT NULL,
  filename    TEXT NOT NULL,
  mime_type   TEXT NOT NULL,
  size_bytes  INTEGER NOT NULL,
  width       INTEGER,
  height      INTEGER,
  alt_text    TEXT NOT NULL DEFAULT '',
  title       TEXT NOT NULL DEFAULT '',
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at  TEXT
);

-- --------------------------------------------------------- categorias/autores
CREATE TABLE categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE authors (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT '',
  bio        TEXT NOT NULL DEFAULT '',
  photo_id   INTEGER REFERENCES media(id) ON DELETE SET NULL,
  status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------- serviços
CREATE TABLE services (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  slug             TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  short_name       TEXT NOT NULL DEFAULT '',
  display_order    INTEGER NOT NULL DEFAULT 0,
  featured         INTEGER NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  icon             TEXT NOT NULL DEFAULT 'stethoscope',
  summary          TEXT NOT NULL DEFAULT '',
  hero_title       TEXT NOT NULL DEFAULT '',
  hero_lead        TEXT NOT NULL DEFAULT '',
  image_id         INTEGER REFERENCES media(id) ON DELETE SET NULL,
  image_alt        TEXT NOT NULL DEFAULT '',
  -- conteúdo estruturado (intro, highlights, blocks, deliverables, audience)
  -- gravado como JSON — mesmo formato consumido hoje por src/data/services.ts
  content_json     TEXT NOT NULL DEFAULT '{}',
  whatsapp_message TEXT NOT NULL DEFAULT '',
  seo_title        TEXT NOT NULL DEFAULT '',
  seo_description  TEXT NOT NULL DEFAULT '',
  created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at       TEXT
);
CREATE INDEX idx_services_status ON services(status);

-- ---------------------------------------------------------------- matérias
CREATE TABLE posts (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  slug             TEXT NOT NULL UNIQUE,
  title            TEXT NOT NULL,
  excerpt          TEXT NOT NULL DEFAULT '',
  category_id      INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  author_id        INTEGER REFERENCES authors(id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  featured         INTEGER NOT NULL DEFAULT 0,
  cover_id         INTEGER REFERENCES media(id) ON DELETE SET NULL,
  cover_alt        TEXT NOT NULL DEFAULT '',
  reading_minutes  INTEGER NOT NULL DEFAULT 5,
  -- corpo em blocos tipados (paragraph/h2/h3/list/quote/divider) — JSON,
  -- mesmo contrato de src/data/posts.ts (BlockNode[])
  body_json        TEXT NOT NULL DEFAULT '[]',
  seo_title        TEXT NOT NULL DEFAULT '',
  seo_description  TEXT NOT NULL DEFAULT '',
  published_at     TEXT,
  created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at       TEXT
);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_category ON posts(category_id);
CREATE INDEX idx_posts_published_at ON posts(published_at);

-- ----------------------------------------------------------------- páginas
-- Home e demais páginas institucionais, administradas por seções (JSON).
CREATE TABLE pages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  slug            TEXT NOT NULL UNIQUE, -- '/', '/quem-somos', '/contato', ...
  title           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  sections_json   TEXT NOT NULL DEFAULT '[]',
  seo_title       TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  indexable       INTEGER NOT NULL DEFAULT 1,
  updated_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------- configurações
-- chave/valor tipado (empresa, WhatsApp, redes sociais, SEO padrão, marca)
CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------- contatos
CREATE TABLE contacts (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  company          TEXT NOT NULL DEFAULT '',
  role             TEXT NOT NULL DEFAULT '',
  email            TEXT NOT NULL,
  phone            TEXT NOT NULL DEFAULT '',
  org_type         TEXT NOT NULL DEFAULT '',
  service          TEXT NOT NULL DEFAULT '',
  subject          TEXT NOT NULL DEFAULT '',
  message          TEXT NOT NULL,
  origin           TEXT NOT NULL DEFAULT '',
  consent          INTEGER NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'novo'
                     CHECK (status IN ('novo', 'em_atendimento', 'respondido', 'arquivado')),
  internal_note    TEXT NOT NULL DEFAULT '',
  ip               TEXT NOT NULL DEFAULT '',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_contacts_created_at ON contacts(created_at);

-- rate limiting simples do endpoint público de contato (por IP)
CREATE TABLE contact_rate_limit (
  ip           TEXT PRIMARY KEY,
  attempts     INTEGER NOT NULL DEFAULT 1,
  window_start TEXT NOT NULL DEFAULT (datetime('now'))
);

-- --------------------------------------------------------- redirecionamentos
CREATE TABLE redirects (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  from_path  TEXT NOT NULL UNIQUE,
  to_path    TEXT NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 301 CHECK (status_code IN (301, 302)),
  hits       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- --------------------------------------------------------------- audit log
CREATE TABLE audit_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_name  TEXT NOT NULL DEFAULT '',
  action     TEXT NOT NULL,     -- ex.: 'login', 'service.publish', 'settings.update'
  target     TEXT NOT NULL DEFAULT '',
  ip         TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
