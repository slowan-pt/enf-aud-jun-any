-- Adiciona foto do autor em texto simples (mesmo padrão de cover_url em
-- posts), em vez de depender só do FK `photo_id` (que exigiria um registro
-- em `media` por autor).
ALTER TABLE authors ADD COLUMN photo_url TEXT NOT NULL DEFAULT '';
