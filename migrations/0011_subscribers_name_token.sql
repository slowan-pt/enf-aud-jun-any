-- Inscritos: nome (para personalizar o e-mail) e token individual (link de
-- cancelamento que funciona sozinho). Aditiva.
ALTER TABLE newsletter_subscribers ADD COLUMN name TEXT NOT NULL DEFAULT '';
ALTER TABLE newsletter_subscribers ADD COLUMN token TEXT NOT NULL DEFAULT '';

-- Quem ja estava na lista ganha um token proprio (32 hex aleatorios).
UPDATE newsletter_subscribers SET token = lower(hex(randomblob(16))) WHERE token = '';

CREATE UNIQUE INDEX idx_newsletter_token ON newsletter_subscribers(token);
