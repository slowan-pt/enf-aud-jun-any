-- Curriculos recebidos pela pagina publica "Trabalhe conosco".
-- Aditiva: o PDF fica no R2 (r2_key); aqui so os metadados.
CREATE TABLE job_applications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT NOT NULL DEFAULT '',
  message     TEXT NOT NULL DEFAULT '',
  r2_key      TEXT NOT NULL,
  filename    TEXT NOT NULL,
  size_bytes  INTEGER NOT NULL,
  email_sent  INTEGER NOT NULL DEFAULT 0,
  ip          TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_job_applications_created ON job_applications(created_at);
