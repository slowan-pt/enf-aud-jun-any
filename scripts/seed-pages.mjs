#!/usr/bin/env node
/**
 * Gera o SQL de seed da tabela `pages` para a Home ('/'), a partir do
 * conteúdo real hoje em src/data/institutional.ts. Idempotente (ON CONFLICT).
 *
 * Uso:
 *   node scripts/seed-pages.mjs > /tmp/seed.sql
 *   npx wrangler d1 execute essencial-saude-db --local --file=/tmp/seed.sql
 */
import {
  hero,
  valueProposition,
  elo,
  benefits,
  howWeWork,
  missionVisionValues,
  clientSegments,
  finalCta,
} from '../src/data/institutional.ts';

function esc(value) {
  return String(value).replace(/'/g, "''");
}

const sections = JSON.stringify({
  hero,
  valueProposition,
  elo,
  benefits,
  howWeWork,
  missionVisionValues,
  clientSegments,
  finalCta,
});

console.log(`INSERT INTO pages (slug, title, status, sections_json, seo_title, seo_description, indexable)
VALUES ('/', 'Home', 'published', '${esc(sections)}', '', '', 1)
ON CONFLICT(slug) DO NOTHING;`);
