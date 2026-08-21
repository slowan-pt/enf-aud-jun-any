-- Adiciona um caminho de capa em texto simples às matérias, no mesmo padrão
-- já usado para hero/serviços (caminho publicado em /images/ ou /media/),
-- em vez de depender só do FK `cover_id` (que exige upload real via Mídia).
ALTER TABLE posts ADD COLUMN cover_url TEXT NOT NULL DEFAULT '';
