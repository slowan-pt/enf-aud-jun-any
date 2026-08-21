#!/usr/bin/env node
/**
 * Gera o SQL de seed inicial da tabela `services`, a partir do conteúdo real
 * hoje em src/data/services.ts (6 serviços, redigidos a partir do PDF
 * institucional). Roda uma única vez (idempotente via ON CONFLICT).
 *
 * Uso:
 *   node scripts/seed-services.mjs > /tmp/seed.sql
 *   npx wrangler d1 execute essencial-saude-db --local --file=/tmp/seed.sql
 */
import { services } from '../src/data/services.ts';

function esc(value) {
  return String(value).replace(/'/g, "''");
}

for (const s of services) {
  const content = JSON.stringify({
    image: s.image,
    imageAlt: s.imageAlt,
    intro: s.intro,
    highlights: s.highlights,
    blocks: s.blocks,
    deliverables: s.deliverables,
    audience: s.audience,
  });

  console.log(`INSERT INTO services
    (slug, name, short_name, display_order, featured, status, icon, summary, hero_title, hero_lead,
     content_json, whatsapp_message, seo_title, seo_description)
  VALUES (
    '${esc(s.slug)}', '${esc(s.name)}', '${esc(s.shortName)}', ${s.order}, ${s.featured ? 1 : 0},
    '${s.status}', '${esc(s.icon)}', '${esc(s.summary)}', '${esc(s.heroTitle)}', '${esc(s.heroLead)}',
    '${esc(content)}', '${esc(s.whatsappMessage)}', '${esc(s.seo.title)}', '${esc(s.seo.description)}'
  )
  ON CONFLICT(slug) DO NOTHING;`);
}
