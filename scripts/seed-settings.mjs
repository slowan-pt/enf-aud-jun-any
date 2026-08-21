#!/usr/bin/env node
/**
 * Gera o SQL de seed inicial da tabela `settings`, a partir dos valores
 * reais hoje em src/data/site.ts. Roda uma única vez (idempotente via
 * ON CONFLICT) para popular o banco antes do primeiro uso do painel.
 *
 * Uso:
 *   node scripts/seed-settings.mjs > /tmp/seed.sql
 *   npx wrangler d1 execute essencial-saude-db --local --file=/tmp/seed.sql
 */
import { company, whatsapp, social } from '../src/data/site.ts';

function upsert(key, value) {
  const json = JSON.stringify(value).replace(/'/g, "''");
  return `INSERT INTO settings (key, value_json) VALUES ('${key}', '${json}')
ON CONFLICT(key) DO NOTHING;`;
}

console.log(upsert('company', company));
console.log(upsert('whatsapp', whatsapp));
console.log(upsert('social', social));
