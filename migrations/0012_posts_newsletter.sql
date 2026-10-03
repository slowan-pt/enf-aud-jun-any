-- Controle de envio da newsletter por matéria: evita mandar o mesmo e-mail duas
-- vezes quando a matéria é salva de novo. Aditiva.
ALTER TABLE posts ADD COLUMN newsletter_sent_at TEXT;
ALTER TABLE posts ADD COLUMN newsletter_sent_count INTEGER NOT NULL DEFAULT 0;
