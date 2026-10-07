-- Pedidos de download do Portfólio (PDF). Cada pedido fica "pendente" até a
-- Essencial aprovar ou recusar; só depois de aprovado existe link de download
-- (token próprio, com prazo). Aditiva.
CREATE TABLE portfolio_requests (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  email            TEXT NOT NULL,
  phone            TEXT NOT NULL DEFAULT '',
  company          TEXT NOT NULL DEFAULT '',
  role             TEXT NOT NULL DEFAULT '',
  consent          INTEGER NOT NULL DEFAULT 1,
  status           TEXT NOT NULL DEFAULT 'pendente',
  approve_token    TEXT NOT NULL,
  download_token   TEXT NOT NULL DEFAULT '',
  download_expires TEXT,
  downloads        INTEGER NOT NULL DEFAULT 0,
  mail_sent        INTEGER NOT NULL DEFAULT 0,
  ip               TEXT NOT NULL DEFAULT '',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  decided_at       TEXT
);
CREATE UNIQUE INDEX idx_portfolio_approve ON portfolio_requests(approve_token);
CREATE INDEX idx_portfolio_download ON portfolio_requests(download_token);
CREATE INDEX idx_portfolio_status ON portfolio_requests(status, created_at);
